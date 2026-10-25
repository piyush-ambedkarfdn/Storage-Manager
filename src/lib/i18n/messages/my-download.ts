import { defineMessages } from "@/lib/i18n";

export const myDownloadMessages = defineMessages({
  en: {
    downloadThese: "Download these photos",
    downloadAll: "Download all my photos",
    downloadReport: "Download",
    hint: "You get a ZIP: a folder for each village, and inside it a folder for each activity type.",
    preparing: "Preparing the list…",
    saving: "Saving {done} of {total} photos…",
    cancel: "Cancel",
    saved: "{n} photos saved in a ZIP, sorted by village and activity type.",
    none: "There are no photos to download yet.",
    failedSome: "{n} photos could not be downloaded. Try again.",
    failed: "The download failed. Check your network and try again.",
  },
  hi: {
    downloadThese: "ये फोटो डाउनलोड करें",
    downloadAll: "मेरी सभी फोटो डाउनलोड करें",
    downloadReport: "डाउनलोड",
    hint: "आपको एक ZIP मिलेगी: हर गाँव का एक फोल्डर, और उसके अंदर हर गतिविधि प्रकार का फोल्डर।",
    preparing: "सूची तैयार हो रही है…",
    saving: "{total} में से {done} फोटो सेव हो रही हैं…",
    cancel: "रद्द करें",
    saved: "{n} फोटो गाँव और गतिविधि प्रकार के अनुसार ZIP में सेव हुईं।",
    none: "अभी डाउनलोड करने के लिए कोई फोटो नहीं है।",
    failedSome: "{n} फोटो डाउनलोड नहीं हो सकीं। फिर कोशिश करें।",
    failed: "डाउनलोड विफल रहा। नेटवर्क जाँचकर फिर कोशिश करें।",
  },
});
