import type { MetadataRoute } from "next";

// Added to a phone's home screen, the show opens without the browser's address bar, which matters
// when the phone is mirrored to a TV: Safari on an iPhone cannot make a page full screen otherwise.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Do it live",
    short_name: "Do it live",
    description: "A presentation that listens. Talk, and the slides follow.",
    start_url: "/",
    display: "fullscreen",
    background_color: "#000000",
    theme_color: "#000000",
  };
}
