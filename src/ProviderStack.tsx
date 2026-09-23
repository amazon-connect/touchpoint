/* eslint-disable jsdoc/require-jsdoc */
import { type FC, type ReactNode, useMemo, useRef } from "react";
import { clsx } from "clsx";
import { Tooltip } from "@base-ui/react/tooltip";

import { CopyProvider, defaultCopy } from "./utils/useCopy";
import { type Copy, type ColorMode, type Theme } from "./interface";
import { AppRootProvider } from "./utils/useAppRoot";
import { intelligentMerge, toCustomProperties } from "./components/Theme";
import {
  sanitizeContainerStyle,
  type ContainerStyle,
} from "./utils/containerStyle";

export const ProviderStack: FC<{
  colorMode: ColorMode;
  className?: string;
  containerStyle?: ContainerStyle;
  theme?: Partial<Theme>;
  children?: ReactNode;
  languageCode: string;
  copy?: Partial<Copy>;
}> = ({
  colorMode,
  children,
  theme,
  className,
  containerStyle,
  copy,
  languageCode,
}) => {
  const themeWithOverrides: Theme = intelligentMerge(theme ?? {});
  // Sanitized here rather than at the configuration boundary so that every
  // caller of the provider stack gets the same treatment, and so that a warning
  // is only logged once per change of the style object.
  const safeContainerStyle = useMemo(
    () => sanitizeContainerStyle(containerStyle),
    [containerStyle],
  );
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Tooltip.Provider>
      <CopyProvider value={{ ...defaultCopy(languageCode), ...(copy ?? {}) }}>
        <AppRootProvider value={ref}>
          <div
            ref={ref}
            className="contents"
            style={{
              ...toCustomProperties(themeWithOverrides),
              colorScheme: colorMode,
            }}
          >
            <div
              className={clsx(className, "font-sans")}
              style={safeContainerStyle}
            >
              {children}
            </div>
          </div>
        </AppRootProvider>
      </CopyProvider>
    </Tooltip.Provider>
  );
};
