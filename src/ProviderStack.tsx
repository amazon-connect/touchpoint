/* eslint-disable jsdoc/require-jsdoc */
import { type FC, type ReactNode, useRef } from "react";
import { clsx } from "clsx";
import { Tooltip } from "@base-ui/react/tooltip";

import { CopyProvider, defaultCopy } from "./utils/useCopy";
import { type Copy, type ColorMode, type Theme } from "./interface";
import { AppRootProvider } from "./utils/useAppRoot";
import {
  intelligentMerge,
  ProvidedThemeFieldsProvider,
  type ThemeField,
  toCustomProperties,
} from "./components/Theme";
import { type CustomStyle } from "./utils/containerStyle";

export const ProviderStack: FC<{
  colorMode: ColorMode;
  className?: string;
  /** Already sanitized by the configuration normalization in `App`. */
  containerStyle?: CustomStyle;
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
  const providedThemeFields = Object.keys(theme ?? {}) as ThemeField[];
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Tooltip.Provider>
      <CopyProvider value={{ ...defaultCopy(languageCode), ...(copy ?? {}) }}>
        <ProvidedThemeFieldsProvider value={providedThemeFields}>
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
                style={containerStyle}
              >
                {children}
              </div>
            </div>
          </AppRootProvider>
        </ProvidedThemeFieldsProvider>
      </CopyProvider>
    </Tooltip.Provider>
  );
};
