import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type FC,
} from "react";
import { App } from "./App";
import { DesignSystem } from "./designSystem/DesignSystem";
import { isDesignSystemHash } from "./routes";

interface RouterValue {
  /** The current fragment, e.g. `#design-system/carousel` (`""` on the bare page). */
  hash: string;
  /** Goes to a fragment without reloading the page. */
  navigate: (hash: string) => void;
}

const RouterContext = createContext<RouterValue>({
  hash: "",
  navigate: () => {},
});

/** The current fragment, for fragment-addressed state and for {@link Link}. */
export const useRouter = (): RouterValue => useContext(RouterContext);

/**
 * Anchor that navigates in place. Only a plain left click is intercepted:
 * modified and middle clicks fall through to the browser, so opening a page in
 * a new tab keeps working.
 */
export const Link: FC<AnchorHTMLAttributes<HTMLAnchorElement>> = ({
  href,
  onClick,
  ...rest
}) => {
  const { navigate } = useRouter();
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          href == null ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
};

/**
 * Rudimentary fragment router: holds the current fragment, hands it (and a way
 * to change it) to the tree, and renders the page it addresses.
 */
export const Router: FC = () => {
  const [hash, setHash] = useState(() => window.location.hash);

  // Back/forward, and a fragment typed into the address bar, both arrive as
  // browser events rather than through `navigate`.
  useEffect(() => {
    const sync = (): void => {
      setHash(window.location.hash);
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const navigate = useCallback((next: string): void => {
    // A bare `#` is the playground, written as a clean URL without a fragment.
    const target = next === "#" ? "" : next;
    if (target !== window.location.hash) {
      const { pathname, search } = window.location;
      // `pushState` (not a hash assignment) so the entry-less `#` case is
      // reachable, and so no `hashchange` doubles up with the state below.
      history.pushState(null, "", `${pathname}${search}${target}`);
    }
    setHash(target);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <RouterContext.Provider value={{ hash, navigate }}>
      {isDesignSystemHash(hash) ? <DesignSystem /> : <App />}
    </RouterContext.Provider>
  );
};
