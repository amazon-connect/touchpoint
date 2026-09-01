import { type CustomModalityComponent } from "../../interface";
import { DefaultDateInput } from "./DefaultDateInput";
import { DefaultCard } from "./DefaultCard";
import { DefaultCarousel } from "./DefaultCarousel";
import { DefaultVideo } from "./DefaultVideo";

export const defaultModalities: Record<
  string,
  CustomModalityComponent<unknown>
> = {
  DefaultDateInput: DefaultDateInput as CustomModalityComponent<unknown>,
  DefaultCard: DefaultCard as CustomModalityComponent<unknown>,
  DefaultCarousel: DefaultCarousel as CustomModalityComponent<unknown>,
  DefaultVideo: DefaultVideo as CustomModalityComponent<unknown>,
};
