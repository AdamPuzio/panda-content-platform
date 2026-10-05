export interface Post {
  slug: string
  title: string
  status: 'draft' | 'published'
}

export class ContentStore {
  private posts: Post[] = [
    { slug: 'welcome', title: 'Welcome to Panda', status: 'published' },
    { slug: 'draft-roadmap', title: 'The Roadmap', status: 'draft' },
  ]

  list(includeDrafts = false): Post[] {
    return this.posts.filter((post) => includeDrafts || post.status === 'published')
  }

  publish(slug: string): Post {
    const post = this.posts.find((candidate) => candidate.slug === slug)
    if (!post) throw new Error(`Post "${slug}" does not exist`)
    post.status = 'published'
    return post
  }
}
