/* ==========================================================================
   English Reboot — варианты тона для ступени 5 лестницы «Смени тон»
   Файл: tone_us.js — ВРУЧНУЮ написанные варианты одной мысли в трёх регистрах:
     polite  — вежливее: незнакомцу, начальнику, в сервисе;
     neutral — нейтрально: коллеге, знакомому;
     friend  — как другу: легко, по-свойски (gonna, wanna, lemme уместны).
   Ключ — фраза из content_us.js символ в символ (проверяется юнит-тестом).
   У фраз без записи здесь ступень 5 пропускается. Пополнять небольшими партиями,
   массово не генерировать. Партия 1: 50 фраз.
   ========================================================================== */

const TONE_VARIANTS = {
  // Просьбы и вежливость
  'Could you give me a hand?': { polite: 'Would you mind helping me with this?', neutral: 'Could you give me a hand?', friend: 'Hey, gimme a hand?' },
  'Do you have a minute?': { polite: 'Excuse me, do you have a moment?', neutral: 'Do you have a minute?', friend: 'Got a sec?' },
  'Can I borrow your pen?': { polite: 'Would it be possible to borrow your pen?', neutral: 'Can I borrow your pen?', friend: 'Lemme borrow your pen real quick.' },
  'Can you pass the salt?': { polite: 'Would you mind passing the salt, please?', neutral: 'Can you pass the salt?', friend: 'Pass the salt?' },
  'Thanks a lot': { polite: 'Thank you very much, I really appreciate it.', neutral: 'Thanks a lot.', friend: 'Thanks, man!' },
  "You're welcome": { polite: "You're very welcome.", neutral: "You're welcome.", friend: 'No prob!' },
  "I'm so sorry about that": { polite: 'I sincerely apologize for that.', neutral: "I'm so sorry about that.", friend: 'My bad!' },
  "I'd rather not": { polite: "I'd prefer not to, if that's all right.", neutral: "I'd rather not.", friend: "Nah, I'm good." },
  'Can I ask you something?': { polite: 'May I ask you a question?', neutral: 'Can I ask you something?', friend: 'Hey, random question…' },
  'Sorry to keep you waiting': { polite: 'I apologize for the wait.', neutral: 'Sorry to keep you waiting.', friend: "Sorry, sorry, I'm here!" },
  'Is it okay if I sit here?': { polite: 'Excuse me, is this seat taken?', neutral: 'Is it okay if I sit here?', friend: 'Mind if I grab this seat?' },
  'Would you like some help?': { polite: 'May I help you with that?', neutral: 'Do you need some help?', friend: 'Need a hand?' },
  'I appreciate it': { polite: 'I truly appreciate your help.', neutral: 'I appreciate it.', friend: 'Thanks, you rock!' },
  'No problem': { polite: "It's no trouble at all.", neutral: 'No problem.', friend: 'No worries!' },

  // В кафе и ресторане
  'Could we get the check?': { polite: 'Excuse me, could we have the check, please?', neutral: 'Could we get the check?', friend: 'Check, please!' },
  'Can I get a coffee?': { polite: 'Could I please have a coffee?', neutral: 'Can I get a coffee?', friend: 'Lemme get a coffee.' },
  'What do you recommend?': { polite: 'What would you recommend?', neutral: 'What do you recommend?', friend: "What's good here?" },
  'Can we split the check?': { polite: 'Would it be possible to split the check?', neutral: 'Can we split the check?', friend: 'Wanna split it?' },
  "Let's grab a bite": { polite: 'Would you like to have lunch together sometime?', neutral: "Let's grab a bite.", friend: 'Wanna grab some food?' },
  'My treat': { polite: "Please, allow me — it's on me.", neutral: 'My treat.', friend: 'I got this.' },
  "I'm stuffed": { polite: "I'm quite full, thank you.", neutral: "I'm full.", friend: "I'm stuffed." },
  "Excuse me, this isn't what I ordered": { polite: "I'm sorry, I think there's been a mistake with my order.", neutral: "Excuse me, this isn't what I ordered.", friend: "Uh, this isn't mine." },

  // Работа и офис
  'Can we touch base tomorrow?': { polite: 'Would you be available to talk tomorrow?', neutral: 'Can we touch base tomorrow?', friend: 'Talk tomorrow?' },
  'Let me get back to you on that': { polite: "I'll get back to you on that as soon as possible.", neutral: 'Let me get back to you on that.', friend: 'Lemme get back to you.' },
  'I need a hand with this': { polite: 'Would someone be able to help me with this?', neutral: 'I need a hand with this.', friend: 'Help me out here?' },
  'Can you cover for me?': { polite: 'Would you be able to cover my shift?', neutral: 'Can you cover for me?', friend: 'Cover for me? I owe you.' },
  "I'll take care of it": { polite: "I'll make sure it's taken care of.", neutral: "I'll take care of it.", friend: 'I got it.' },
  "Let's call it a day": { polite: 'I think we can wrap up for today.', neutral: "Let's call it a day.", friend: "I'm done. Let's bounce." },
  "I'm swamped": { polite: "I'm afraid I'm quite busy at the moment.", neutral: "I'm really busy right now.", friend: "I'm swamped." },

  // Созвоны и встречи
  'Can you hear me?': { polite: 'Can everyone hear me okay?', neutral: 'Can you hear me?', friend: 'Hello? You there?' },
  'Could you say that again?': { polite: "I'm sorry, could you repeat that, please?", neutral: 'Could you say that again?', friend: 'Wait, what?' },
  'Can we reschedule?': { polite: 'Would it be possible to reschedule our meeting?', neutral: 'Can we reschedule?', friend: 'Can we do another day?' },
  "I can't make it": { polite: "Unfortunately, I won't be able to attend.", neutral: "I can't make it.", friend: "I'm gonna have to bail." },
  'Sorry to interrupt': { polite: 'Pardon the interruption, but…', neutral: 'Sorry to interrupt.', friend: 'Wait, wait — hold on.' },
  "Let's hop on a call": { polite: 'Would you be available for a quick call?', neutral: "Let's hop on a call.", friend: 'Just call me.' },
  "Let's wrap up": { polite: 'I think we can wrap things up here.', neutral: "Let's wrap up.", friend: "Okay, that's it, we're done!" },

  // Друзья и планы
  'Wanna hang out?': { polite: 'Would you like to get together sometime?', neutral: 'Do you want to hang out?', friend: 'Wanna hang out?' },
  'What are you up to tonight?': { polite: 'Do you have any plans this evening?', neutral: 'What are you doing tonight?', friend: 'What are you up to tonight?' },
  'What time works for you?': { polite: 'What time would be convenient for you?', neutral: 'What time works for you?', friend: "When's good?" },
  'Count me out': { polite: "Thank you, but I'll have to pass.", neutral: 'Count me out.', friend: "Nah, I'm out." },
  'Rain check?': { polite: 'Could we possibly do it another time?', neutral: 'Can I take a rain check?', friend: 'Rain check?' },
  "Let's catch up soon": { polite: "I'd love to get together and catch up soon.", neutral: "Let's catch up soon.", friend: 'We gotta catch up!' },
  'I owe you one': { polite: "I'm very grateful for your help.", neutral: 'I owe you one.', friend: "You're a lifesaver!" },

  // Знакомство и small talk
  'Pleasure to meet you': { polite: "It's a pleasure to meet you.", neutral: 'Nice to meet you.', friend: 'Hey, good to meet ya!' },
  "I didn't catch your name": { polite: "I'm sorry, I didn't catch your name.", neutral: 'What was your name again?', friend: 'Remind me your name?' },
  'Have a good one': { polite: 'Have a wonderful day.', neutral: 'Have a good day.', friend: 'Have a good one!' },
  'Talk to you soon': { polite: 'I look forward to speaking with you soon.', neutral: 'Talk to you soon.', friend: 'Talk soon!' },
  'Good talking to you': { polite: 'It was a pleasure talking with you.', neutral: 'Good talking to you.', friend: 'Good catching up!' },

  // Покупки
  'How much is this?': { polite: 'Excuse me, could you tell me how much this is?', neutral: 'How much is this?', friend: 'How much?' },
  "I'll think about it": { polite: "Thank you, I'll give it some thought.", neutral: "I'll think about it.", friend: 'Lemme think about it.' },
};

if (typeof window !== 'undefined') window.TONE_VARIANTS = TONE_VARIANTS;
if (typeof globalThis !== 'undefined') globalThis.TONE_VARIANTS = TONE_VARIANTS;
