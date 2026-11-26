// Phase 3 content: podcasts, grammar cards, idioms. Extends window.CONTENT; never retypes content.js.
// Weekly updates: push a new item onto any array below (or C.stories / C.scenarios) and give it
// added:"YYYY-MM-DD" — items added within the last 7 days show a «جدید» badge automatically.
(function (C) {
  C.podcasts = (C.podcasts || []).concat([
    { id: "coffee", level: "B1", added: "2026-11-25", title: "Why do we love coffee?", fa: "چرا قهوه رو دوست داریم؟",
      hosts: { N: "Neil", S: "Sam" },
      ask: { q: "Which country drinks the most coffee per person?", o: ["Brazil", "Finland", "Italy"], a: 1 },
      lines: [
        ["N", "Hello, this is Six Minute English. I'm Neil."],
        ["S", "And I'm Sam. Today we're talking about coffee."],
        ["N", "First, a question, Sam. Which country drinks the most coffee per person? Is it a) Brazil, b) Finland, or c) Italy?"],
        ["S", "I'll guess Italy."],
        ["N", "We'll find out later. So, why do you drink coffee?"],
        ["S", "Honestly, I can't function without it in the morning."],
        ["N", "'Can't function' means you can't work or think properly."],
        ["S", "Coffee contains caffeine, a stimulant, something that makes your body and brain more active."],
        ["N", "But too much caffeine can make you jittery, nervous and shaky."],
        ["S", "That's why I stop after two cups."],
        ["N", "Sensible. Now, the answer: it's b) Finland!"],
        ["S", "Blimey, I was wrong. Let's recap the vocabulary."]],
      vocab: [["can't function", "نمی‌تونم درست کار کنم یا فکر کنم"], ["caffeine", "کافئین"], ["stimulant", "محرک"], ["jittery", "عصبی و لرزان"], ["recap", "جمع‌بندی"]],
      q: [["What is a stimulant?", ["something that makes you more active", "a kind of cup", "a type of sugar"], 0],
        ["Which country drinks the most coffee per person?", ["Italy", "Finland", "Brazil"], 1],
        ["Why does Sam stop after two cups?", ["to avoid feeling jittery", "it's expensive", "he dislikes coffee"], 0]] },
    { id: "ai-teacher", level: "B2", added: "2026-11-25", title: "Can AI be your teacher?", fa: "هوش مصنوعی می‌تونه معلمت باشه؟",
      hosts: { N: "Neil", S: "Sam" },
      ask: { q: "Roughly how many people are learning English worldwide?", o: ["500 million", "1.5 billion", "3 billion"], a: 1 },
      lines: [
        ["N", "Hello, I'm Neil, and this is Six Minute English."],
        ["S", "And I'm Sam. Today: can artificial intelligence replace teachers?"],
        ["N", "Quiz question: roughly how many people are learning English worldwide? a) 500 million, b) 1.5 billion, c) 3 billion?"],
        ["S", "I'll say b."],
        ["N", "AI tutors are available round the clock, any time of day or night."],
        ["S", "And they never lose patience, the ability to stay calm when things are slow or difficult."],
        ["N", "But critics say AI lacks empathy, the ability to understand how someone feels."],
        ["S", "So perhaps AI is a tool, not a replacement."],
        ["N", "Well put. And the answer: b) about 1.5 billion people."],
        ["S", "I got it right! Let's recap."]],
      vocab: [["round the clock", "شبانه‌روزی"], ["lose patience", "حوصله از دست دادن"], ["empathy", "همدلی"], ["critic", "منتقد"], ["replacement", "جایگزین"]],
      q: [["'Round the clock' means…", ["all day and night", "only at night", "on time"], 0],
        ["What do critics say AI lacks?", ["speed", "empathy", "data"], 1],
        ["How many people learn English?", ["500 million", "1.5 billion", "3 billion"], 1]] }
  ]);

  C.grammar = (C.grammar || []).concat([
    { id: "pp-ps", level: "B1", added: "2026-11-25", title: "Present Perfect vs Past Simple", fa: "حال کامل یا گذشته ساده",
      explain: ["گذشته ساده (went, saw) برای کاری که در یک زمان مشخص و تموم‌شده در گذشته اتفاق افتاده: yesterday، last year، in 2020.",
        "حال کامل (have/has + p.p.) وقتی زمان مهم نیست یا اثرش هنوز هست: ever، never، already، yet، since، for. در انگلیسی بریتانیایی برای خبر تازه هم بیشتر از حال کامل استفاده می‌شه."],
      ex: [["I went to Istanbul last year.", "پارسال رفتم استانبول."], ["I've lived in Tehran since 2015.", "از ۲۰۱۵ تو تهران زندگی می‌کنم."], ["Have you ever tried haggis?", "تا حالا هگیس امتحان کردی؟"]],
      q: [["I ___ to Istanbul last year.", ["have gone", "went", "have been going"], 1],
        ["She ___ her keys, so she can't get into her flat.", ["has lost", "loses", "was losing"], 0],
        ["___ you ever ___ to Scotland?", ["Did / go", "Have / been", "Were / going"], 1]] },
    { id: "first-cond", level: "B1", added: "2026-11-25", title: "First Conditional", fa: "شرطی نوع اول",
      explain: ["برای یک شرط واقعی و ممکن در آینده: If + حال ساده، will + فعل ساده.",
        "بعد از if از will استفاده نمی‌کنیم. unless یعنی «اگه نه» (if … not)."],
      ex: [["If you revise, you will pass.", "اگه مرور کنی، قبول می‌شی."], ["If it rains, we'll stay in.", "اگه بارون بیاد، خونه می‌مونیم."], ["I won't go unless you come too.", "نمی‌رم مگه اینکه تو هم بیای."]],
      q: [["If you revise, you ___ pass.", ["would", "will", "did"], 1],
        ["If it ___ tomorrow, we'll stay in.", ["rains", "will rain", "rained"], 0],
        ["She won't come unless you ___ her.", ["invite", "will invite", "invited"], 0]] },
    { id: "used-to", level: "A2", added: "2026-11-25", title: "Used to", fa: "عادت یا حالت قدیمی",
      explain: ["used to + فعل ساده یعنی «قبلاً … می‌کردم» و الان دیگه نه.",
        "در منفی و سؤالی d حذف می‌شه: didn't use to، Did you use to …?"],
      ex: [["She used to live in Rasht.", "قبلاً تو رشت زندگی می‌کرد."], ["I didn't use to like coffee.", "قبلاً قهوه دوست نداشتم."], ["Did you use to play football?", "قبلاً فوتبال بازی می‌کردی؟"]],
      q: [["She ___ live in Rasht.", ["use to", "used to", "was used"], 1],
        ["___ you use to walk to school?", ["Did", "Do", "Were"], 0],
        ["I didn't ___ like vegetables.", ["used to", "use to", "using to"], 1]] },
    { id: "get", level: "B1", added: "2026-11-25", title: "Phrasal verbs with 'get'", fa: "فعل‌های عبارتی با get",
      explain: ["get up یعنی از خواب بیدار شدن و بلند شدن. get on with یعنی با کسی رابطه خوب داشتن (یا ادامه دادن یه کار).",
        "get over یعنی از بیماری یا ناراحتی خلاص شدن و کنار اومدن."],
      ex: [["I get up at half six on weekdays.", "روزهای کاری ساعت شش و نیم بیدار می‌شم."], ["I get on with my flatmates.", "با هم‌خونه‌هام رابطه خوبی دارم."], ["It took me weeks to get over the flu.", "چند هفته طول کشید تا از آنفولانزا خوب بشم."]],
      q: [["It took me weeks to ___ the flu.", ["get on", "get over", "get up"], 1],
        ["Do you ___ your new colleagues?", ["get on with", "get over", "get up"], 0],
        ["I ___ early to go to the gym.", ["get over", "get on with", "get up"], 2]] }
  ]);

  C.idioms = (C.idioms || []).concat([
    { en: "break the ice", fa: "یخ رو شکستن", ex: "A quick joke helped to break the ice at the meeting." },
    { en: "hit the books", fa: "جدی درس خوندن", ex: "I can't come to the pub tonight; I need to hit the books." },
    { en: "piece of cake", fa: "خیلی آسون", ex: "The driving test was a piece of cake." },
    { en: "under the weather", fa: "کمی ناخوش", ex: "I'm feeling a bit under the weather, so I'll work from home." },
    { en: "call it a day", fa: "کار رو تموم کردن", ex: "We've been at it since eight; let's call it a day." },
    { en: "cost an arm and a leg", fa: "خیلی گرون بودن", ex: "Renting a flat in London costs an arm and a leg." },
    { en: "on the same page", fa: "هم‌نظر بودن", ex: "Let's have a quick chat so we're all on the same page." },
    { en: "once in a blue moon", fa: "خیلی به‌ندرت", ex: "My brother rings me once in a blue moon." }
  ]);
})(window.CONTENT);
