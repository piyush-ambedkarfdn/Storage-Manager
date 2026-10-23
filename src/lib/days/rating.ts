import { defineMessages } from "@/lib/i18n";

/** Photo rating (1 to 5 stars, given by staff while uploading) and the gallery filter for it. */
export const ratingMessages = defineMessages({
  en: {
    rating: "Photo quality",
    ratingHint: "Optional. Tap a star; tap the same star again to clear.",
    starsOf: "{n} of 5 stars",
    star: "{n} star",
    stars: "{n} stars",
    notRated: "Not rated",
    clear: "Clear rating",
    filter: "Rating",
    anyRating: "Rating: any",
    atLeast: "{n}+ stars",
    only5: "5 stars",
    ratedBy: "Rated by staff",
  },
  hi: {
    rating: "फोटो की गुणवत्ता",
    ratingHint: "वैकल्पिक। तारा दबाएँ; हटाने के लिए वही तारा फिर दबाएँ।",
    starsOf: "5 में से {n} तारे",
    star: "{n} तारा",
    stars: "{n} तारे",
    notRated: "रेटिंग नहीं दी",
    clear: "रेटिंग हटाएँ",
    filter: "रेटिंग",
    anyRating: "रेटिंग: कोई भी",
    atLeast: "{n}+ तारे",
    only5: "5 तारे",
    ratedBy: "स्टाफ की रेटिंग",
  },
});

export type RatingKey = keyof typeof ratingMessages.en;
