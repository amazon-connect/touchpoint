/* eslint-disable react/prop-types */
/* eslint-disable jsdoc/require-jsdoc */
import { clsx } from "clsx";
import { useRef, useState } from "react";
import { type CustomModalityComponent } from "../../interface";
import { Play } from "../ui/Icons";
import { useTailwindMediaQuery } from "../../utils/useTailwindMediaQuery";
import { type VideoData } from "./shared";

/**
 * Renders a video sent by the assistant. Takes the full width of the column,
 * with a darkening overlay and a centered play button in its idle state.
 *
 * On desktop the video plays inline using the standard HTML5 player. On mobile
 * we let the OS take over (native fullscreen player) by not forcing inline
 * playback, matching platform expectations.
 */
export const DefaultVideo: CustomModalityComponent<VideoData> = ({
  data,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // `md` and up is treated as desktop → inline playback. Below that, omit
  // `playsInline` so tapping play hands off to the OS native player.
  const isDesktop = useTailwindMediaQuery("md") ?? false;

  if (data?.url == null) {
    return null;
  }

  const start = (): void => {
    const video = videoRef.current;
    if (video == null) {
      return;
    }
    setPlaying(true);
    void video.play();
  };

  return (
    <div
      className={clsx(
        "relative w-full overflow-hidden rounded-inner bg-black",
        className,
      )}
    >
      {/* Uses `previewImageUrl` as the poster when provided; otherwise
          `preload="metadata"` renders the video's first frame. Native controls
          appear only once playback has started. */}
      <video
        ref={videoRef}
        src={data.url}
        poster={data.previewImageUrl}
        preload="metadata"
        controls={playing}
        playsInline={isDesktop}
        className="block h-auto w-full"
        onPlay={() => {
          setPlaying(true);
        }}
      />
      {!playing ? (
        <button
          type="button"
          aria-label="Play video"
          onClick={start}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
            <Play size={28} />
          </span>
        </button>
      ) : null}
    </div>
  );
};
