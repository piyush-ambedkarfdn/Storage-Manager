import { defineMessages } from "@/lib/i18n";

/** Step 2 of the upload: each photo gets its own categories and rating. */
export const uploadPhotosMessages = defineMessages({
  en: {
    step2: "Photos, categories and rating",
    photoN: "Photo {n} of {total}",
    categoriesFor: "Categories for this photo",
    applyToAll: "Use these categories for all photos",
    appliedToAll: "Categories copied to all {n} photos.",
    needCategories: "Choose the required categories for every photo (marked in red).",
    sameReport: "Every photo uses the field report from step 1. Only categories, rating and details differ.",
    ratingLabel: "Rating",
  },
  hi: {
    step2: "फोटो, श्रेणियाँ और रेटिंग",
    photoN: "फोटो {n} / {total}",
    categoriesFor: "इस फोटो की श्रेणियाँ",
    applyToAll: "ये श्रेणियाँ सभी फोटो पर लगाएँ",
    appliedToAll: "श्रेणियाँ सभी {n} फोटो पर लग गईं।",
    needCategories: "हर फोटो के लिए ज़रूरी श्रेणियाँ चुनें (लाल में चिह्नित)।",
    sameReport: "हर फोटो चरण 1 की फील्ड रिपोर्ट इस्तेमाल करती है। सिर्फ़ श्रेणियाँ, रेटिंग और जानकारी अलग हो सकती हैं।",
    ratingLabel: "रेटिंग",
  },
});

export type UploadPhotosKey = keyof typeof uploadPhotosMessages.en;
