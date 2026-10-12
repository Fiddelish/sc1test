(function defineSc1Fighters() {
  "use strict";

  // Gemensam datakälla för #athletes och fighter.html.
  // Kopiera ett helt fighter-objekt för att lägga till en profil.
  // slug måste vara unik och URL-säker; name är namnet som visas i kortet/heron.
  // Saknad text: "". Saknad statistik: null (0 betyder ett känt nollvärde).
  // Vid publicering: använd bekräftade uppgifter. Hawks demo nedan är ett undantag
  // för lokal förhandsvisning enligt referensbilden. Tomma värden visas som NA/platshållare.
  //
  // Hero: realName = Government name; nickname = valfri underrad;
  // instagram = fullständig https://www.instagram.com/... URL.
  // Info: country = Representing; height = Height; weight = Last fight weight (cm/kg);
  // fightingBackground = confirmed training background (e.g. MMA or boxing);
  // affiliation = team/klubb; record = resultat som text.
  // bio = How they fight; knownFor = Known for.
  // Win by: antal vinster per metod, heltal >= 0. Ingen statistik räknas ut från record.
  // Fan reaction: love/hate är bekräftade värden 0–10, inte fungerande omröstningar.
  // Media: portrait = bildsökväg; photos = [{ src: "...", alt: "...", fullSrc: "..." }];
  // fullSrc är valfri högupplöst bild för popupen; om den saknas används src.
  // videos = [{ title: "...", youtubeId: "..." }] (bara video-ID, inte hela URL:en).
  // Tomt photos använder portrait om det finns, annars en tom platshållare.
  // age/weightClass sparas för kompatibilitet; age visas inte i nuvarande profil.
  window.SC1_FIGHTERS = [
    {
      slug: "sukhee",
      name: "Sukhee",
      realName: "",
      nickname: "",
      record: "",
      instagram: "",

      country: "",
      height: "",
      weight: "",
      fightingBackground: "",
      affiliation: "",

      bio: "",
      knownFor: "",
      winBy: {
        koTko: null,
        submission: null,
        opponentForfeit: null,
      },
      fanReaction: {
        love: null,
        hate: null,
      },

      age: "",
      weightClass: "",
      portrait: "",
      photos: [],
      videos: [
        {
          title: "SUPER CLEAN ONE: BADLANDS — SUKHEE VS. HAWK",
          youtubeId: "k3VHu0-hpQ0",
        },
      ],
    },
    {
      // DEMO: exempeluppgifter från användarens referensbild, inte verifierade fakta.
      // Kontrollera/ersätt dessa värden innan publicering.
      slug: "hawk",
      name: "Hawk",
      realName: "Tümen-Erdene Batmunkh",
      nickname: "",
      record: "10–0",
      instagram: "https://www.instagram.com/hawk.sc1/",

      country: "Sweden",
      height: "180 cm",
      weight: "77 kg",
      fightingBackground: "",
      affiliation: "Cleanup Crew",

      bio: "Hawk fights with patience and calculated aggression. He stays composed under pressure, waits for openings, then closes the distance with fast combinations and heavy shots. No wasted movement — just controlled violence.",
      knownFor: "Timing, pressure & finishing instinct.",
      winBy: {
        koTko: 5,
        submission: 3,
        opponentForfeit: 2,
      },
      fanReaction: {
        love: 8,
        hate: 6,
      },

      age: "",
      weightClass: "",
      portrait: "assets/fighters/hawk/testbild.jpeg",
      // Tillfällig layout-preview: samma bild och klipp upprepas i gallerierna.
      photos: [
        { src: "assets/fighters/hawk/testbild.jpeg", alt: "Hawk fighter portrait preview 1" },
        { src: "assets/fighters/hawk/testbild.jpeg", alt: "Hawk fighter portrait preview 2" },
        { src: "assets/fighters/hawk/testbild.jpeg", alt: "Hawk fighter portrait preview 3" },
        { src: "assets/fighters/hawk/testbild.jpeg", alt: "Hawk fighter portrait preview 4" },
        { src: "assets/fighters/hawk/testbild.jpeg", alt: "Hawk fighter portrait preview 5" },
      ],
      videos: [
        {
          title: "SUPER CLEAN ONE: BADLANDS — SUKHEE VS. HAWK · PREVIEW 1",
          youtubeId: "k3VHu0-hpQ0",
        },
        {
          title: "SUPER CLEAN ONE: BADLANDS — SUKHEE VS. HAWK · PREVIEW 2",
          youtubeId: "k3VHu0-hpQ0",
        },
        {
          title: "SUPER CLEAN ONE: BADLANDS — SUKHEE VS. HAWK · PREVIEW 3",
          youtubeId: "k3VHu0-hpQ0",
        },
        {
          title: "SUPER CLEAN ONE: BADLANDS — SUKHEE VS. HAWK · PREVIEW 4",
          youtubeId: "k3VHu0-hpQ0",
        },
      ],
    },
  ];

  window.dispatchEvent(new CustomEvent("sc1:fighters-ready"));
})();
