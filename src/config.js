module.exports = {
  siteTitle: 'Danang Haris Setiawan | Software Engineer',
  siteDescription:
    'Danang Haris Setiawan is a Software Engineer, who loves learning new things and helping tech beginners.',
  siteKeywords:
    'Danang Haris Setiawan, Danang Haris, Risset, Darisset, software engineer, web developer, data analysis, web developer, javascript, danang haris github, portfolio danang haris, risset social, DHS, sikwa dafica indah yuniarta, haris',
  siteUrl: 'https://hi.rissets.com',
  siteLanguage: 'en_US',
  googleAnalyticsID: 'UA-162553650-2',
  googleVerification: 'google-site-verification=JYYngNZL55JU67S6KYbLwZXFC7SbNYqLVU5Xipz9tK8',
  name: 'Danang Haris Setiawan',
  location: 'Tuban, East Java, Indonesia',
  email: 'hi@rissets.com',
  github: 'https://github.com/rissets',
  twitterHandle: '@_risset',
  socialMedia: [
    {
      name: 'GitHub',
      url: 'https://github.com/rissets',
    },
    {
      name: 'Linkedin',
      url: 'https://www.linkedin.com/in/danangharis/',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/_rissets/',
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/_risset',
    },
  ],

  navLinks: [
    {
      name: 'About',
      url: '/#about',
    },
    {
      name: 'Experience',
      url: '/#jobs',
    },
    {
      name: 'Projects',
      url: '/#projects',
    },
    {
      name: 'Contact',
      url: '/#contact',
    },
  ],

  navHeight: 100,

  colors: {
    green: '#64ffda',
    navy: '#0a192f',
    darkNavy: '#020c1b',
  },

  srConfig: (delay = 200) => ({
    origin: 'bottom',
    distance: '20px',
    duration: 500,
    delay,
    rotate: { x: 0, y: 0, z: 0 },
    opacity: 0,
    scale: 1,
    easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    mobile: true,
    reset: false,
    useDelay: 'always',
    viewFactor: 0.25,
    viewOffset: { top: 0, right: 0, bottom: 0, left: 0 },
  }),
};
