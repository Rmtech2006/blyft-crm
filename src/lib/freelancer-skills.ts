export type FreelancerSkillGroup = {
  category: string
  skills: string[]
}

export const FREELANCER_SKILL_GROUPS: FreelancerSkillGroup[] = [
  {
    category: 'Graphic Design',
    skills: ['Social posts', 'Brand identity', 'Thumbnails', 'Posters', 'Pitch decks', 'Print design', 'Ad creatives'],
  },
  {
    category: 'Video Editing',
    skills: ['Reels / Shorts', 'YouTube long-form', 'Podcast editing', 'Ad creatives', 'Color grading', 'Sound cleanup', 'Corporate edits'],
  },
  {
    category: 'Motion Graphics',
    skills: ['Logo animation', 'Explainer videos', 'Kinetic typography', 'Lottie animation', 'Social motion posts'],
  },
  {
    category: '3D Animation',
    skills: ['Product renders', 'Product animation', '3D modeling', 'Character animation', 'Blender', 'Cinema 4D'],
  },
  {
    category: 'Web / UI Design',
    skills: ['Landing pages', 'Dashboards', 'Wireframes', 'Design systems', 'Figma prototypes', 'Responsive layouts'],
  },
  {
    category: 'Development',
    skills: ['Frontend', 'Backend', 'Next.js', 'React', 'Automation', 'API integrations'],
  },
  {
    category: 'Social Media',
    skills: ['Content calendar', 'Community management', 'Caption writing', 'Instagram growth', 'LinkedIn content'],
  },
  {
    category: 'Marketing',
    skills: ['Meta ads', 'Google ads', 'Campaign strategy', 'Landing page audit', 'Performance creatives'],
  },
  {
    category: 'Content Writing',
    skills: ['Blogs', 'Website copy', 'Scripts', 'Ad copy', 'Email copy', 'Case studies'],
  },
]
