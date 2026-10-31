import { defineMessages } from "@/lib/i18n";

export const programSettingsMessages = defineMessages({
  en: {
    button: "Activity types & form",
    dialogTitle: "Upload form: {program}",
    dialogBody: "Choose the activity types staff can pick for this program, and which questions its upload form asks.",
    formTitle: "Questions in the upload form",
    formBody: "Place, date, activity type, consent and photos are always asked. Switch off what this program does not need: for example a meeting asks no report questions or problem themes.",
    askThemes: "Ask for problem themes (causes)",
    required: "Required",
    noQuestions: "This form asks no report questions: only place, date, activity type, consent and photos.",
    saved: "Saved.",
    close: "Close",
  },
  hi: {
    button: "गतिविधि प्रकार और फ़ॉर्म",
    dialogTitle: "अपलोड फ़ॉर्म: {program}",
    dialogBody: "तय करें कि इस प्रोग्राम के लिए स्टाफ कौन-से गतिविधि प्रकार चुन सकते हैं, और अपलोड फ़ॉर्म में कौन-से सवाल पूछे जाएँ।",
    formTitle: "अपलोड फ़ॉर्म के सवाल",
    formBody: "जगह, तारीख़, गतिविधि प्रकार, सहमति और फोटो हमेशा पूछे जाते हैं। जो इस प्रोग्राम को नहीं चाहिए उसे बंद करें: जैसे बैठक में रिपोर्ट के सवाल और समस्या के विषय नहीं पूछे जाते।",
    askThemes: "समस्या के विषय (कारण) पूछें",
    required: "ज़रूरी",
    noQuestions: "इस फ़ॉर्म में रिपोर्ट के सवाल नहीं हैं: केवल जगह, तारीख़, गतिविधि प्रकार, सहमति और फोटो।",
    saved: "सहेजा गया।",
    close: "बंद करें",
  },
});
