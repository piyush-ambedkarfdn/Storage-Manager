import { defineMessages } from "@/lib/i18n";

export const uploadSafeMessages = defineMessages({
  en: {
    preparing: "Preparing photos… {done} of {total}",
    preparingShort: "Preparing…",
    photoError: "This file could not be read as a photo.",
    waitPrep: "Please wait: the photos are still being prepared.",
    nothingReady: "None of the photos could be read. Remove them and add them again.",
    skipped: "{n} photos that could not be read were left out.",
    saving: "Saving on your phone…",
    saveFailed: "The photos could not be saved on this phone ({reason}). They are still here: try again, or add fewer photos at a time.",
    saveSlow: "Saving is taking too long. The phone may be low on storage. Your photos are still here: try again with fewer photos.",
    draftRestored: "Your unfinished upload from {when} was restored.",
    discardDraft: "Start again",
    draftDiscarded: "Draft removed.",
    draftHint: "Unfinished uploads are kept on this phone for 24 hours.",
  },
  hi: {
    preparing: "फोटो तैयार हो रही हैं… {total} में से {done}",
    preparingShort: "तैयार हो रही है…",
    photoError: "यह फ़ाइल फोटो की तरह पढ़ी नहीं जा सकी।",
    waitPrep: "कृपया रुकें: फोटो अभी तैयार हो रही हैं।",
    nothingReady: "कोई भी फोटो पढ़ी नहीं जा सकी। उन्हें हटाकर फिर से जोड़ें।",
    skipped: "{n} फोटो जो पढ़ी नहीं जा सकीं, छोड़ दी गईं।",
    saving: "फ़ोन में सेव हो रहा है…",
    saveFailed: "फोटो इस फ़ोन में सेव नहीं हो सकीं ({reason})। वे यहीं हैं: फिर कोशिश करें, या एक बार में कम फोटो जोड़ें।",
    saveSlow: "सेव होने में बहुत समय लग रहा है। फ़ोन की स्टोरेज कम हो सकती है। आपकी फोटो यहीं हैं: कम फोटो के साथ फिर कोशिश करें।",
    draftRestored: "{when} का आपका अधूरा अपलोड वापस लाया गया।",
    discardDraft: "नए सिरे से शुरू करें",
    draftDiscarded: "ड्राफ़्ट हटा दिया गया।",
    draftHint: "अधूरे अपलोड इस फ़ोन में 24 घंटे तक रखे जाते हैं।",
  },
});
