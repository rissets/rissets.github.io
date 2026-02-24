module.exports = {
  siteTitle: 'Danang Haris Setiawan | AI Engineer & Backend Developer',
  siteDescription:
    'Danang Haris Setiawan is an AI Engineer & Backend Developer specializing in building production-grade AI systems, from face recognition engines to agentic AI platforms.',
  siteKeywords:
    'Danang Haris Setiawan, AI Engineer, Backend Developer, Machine Learning, Django, Python, PyTorch, Tensorflow, LLM, Langchain, Web3, Software Engineer, portfolio',
  siteUrl: 'https://hi.rissets.com',
  siteLanguage: 'en_US',
  googleAnalyticsID: 'UA-162553650-2',
  googleVerification: 'google-site-verification=JYYngNZL55JU67S6KYbLwZXFC7SbNYqLVU5Xipz9tK8',
  name: 'Danang Haris Setiawan',
  location: 'Setiabudi, Jakarta Selatan, Indonesia',
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
      name: 'Blog',
      url: '/pensieve',
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
