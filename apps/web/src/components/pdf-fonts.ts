import { Font } from "@react-pdf/renderer";
import interRegular from "@/assets/fonts/Inter-Regular.ttf?url";
import interSemiBold from "@/assets/fonts/Inter-SemiBold.ttf?url";
import devanagariRegular from "@/assets/fonts/NotoSansDevanagari-Regular.ttf?url";
import devanagariSemiBold from "@/assets/fonts/NotoSansDevanagari-SemiBold.ttf?url";

/*
 * Fonts for generated PDFs, bundled with the app (SIL OFL, licences beside
 * the files). Full static TTFs, not Google Fonts' unicode-range woff2
 * subsets, which left react-pdf without glyphs for capital A, ₨ and most
 * regular-weight text. Inter covers Latin, ₨ − ≈ £ €; Noto Sans Devanagari
 * covers हिसाब (fontkit shapes the reordered ि matra correctly).
 */
Font.register({
  family: "Inter",
  fonts: [
    { src: interRegular, fontWeight: 400 },
    { src: interSemiBold, fontWeight: 600 },
  ],
});

Font.register({
  family: "NotoSansDevanagari",
  fonts: [
    { src: devanagariRegular, fontWeight: 400 },
    { src: devanagariSemiBold, fontWeight: 600 },
  ],
});

// Keep words whole: react-pdf's default hyphenation splits invoice numbers
// and client names at line ends.
Font.registerHyphenationCallback((word) => [word]);

/** Style for Devanagari runs nested inside Inter text, e.g. the हिसाब wordmark */
export const devanagari = { fontFamily: "NotoSansDevanagari" } as const;
