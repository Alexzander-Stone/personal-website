export type ProjectFrontmatter = {
    highlighted: boolean;
    shortTitle: string;
    title: string;
    pubDate: string;
    description: string;
    author: string;
    image: {
        url: string;
        source: string;
        alt: string;
    }
    tags: string[];
}