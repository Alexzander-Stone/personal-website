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
        width: {
            mini: number;
            normal: number
        }
        height: {
            mini: number;
            normal: number;
        }
    }
    tags: string[];
}