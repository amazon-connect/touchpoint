/* eslint-disable jsdoc/require-jsdoc */
import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

import * as defaultIcons from "../components/ui/Icons";
import { type Icon } from "../components/ui/Icons";

/**
 * Name of a built-in icon, e.g. `"Close"`.
 * @category Theming
 */
export type IconName = keyof typeof defaultIcons;

/**
 * Replacement icons keyed by the name of the built-in icon they replace. Any
 * icon left out keeps its default.
 * @category Theming
 */
export type IconOverrides = Partial<Record<IconName, Icon>>;

const IconsContext = createContext<Record<IconName, Icon>>(defaultIcons);

export const IconsProvider: FC<{
  icons?: IconOverrides;
  children?: ReactNode;
}> = ({ icons, children }) => {
  const value = useMemo(() => ({ ...defaultIcons, ...icons }), [icons]);
  return (
    <IconsContext.Provider value={value}>{children}</IconsContext.Provider>
  );
};

export const useIcons = (): Record<IconName, Icon> => useContext(IconsContext);
