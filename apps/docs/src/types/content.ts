export interface ListItem {
  title: string;
  description: string;
  image: string;
  link?: string;
  linkText?: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  publishDate: string;
  description: string;
  coverImage: string;
}
