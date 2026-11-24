import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'

/** Note: this function filters out draft posts based on the environment */
export async function getAllPosts() {
	return await getCollection('post', ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true
	})
}

/**
 * Only personal posts are listed (home, blog, tags, RSS). Every other post is still built and
 * reachable at its URL; it just isn't linked from anywhere.
 */
export function isListed(post: CollectionEntry<'post'>) {
	const { tags } = post.data
	return !tags.includes('hidden') && (tags.includes('personal') || tags.includes('spiritual'))
}

export function sortMDByDate(posts: Array<CollectionEntry<'post'>>) {
	return posts.sort((a, b) => {
		const aDate = new Date(a.data.updatedDate ?? a.data.publishDate).valueOf()
		const bDate = new Date(b.data.updatedDate ?? b.data.publishDate).valueOf()
		return bDate - aDate
	})
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getAllTags(posts: Array<CollectionEntry<'post'>>) {
	return posts.flatMap((post) => [...post.data.tags])
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTags(posts: Array<CollectionEntry<'post'>>) {
	return [...new Set(getAllTags(posts))]
}

/** Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so. */
export function getUniqueTagsWithCount(
	posts: Array<CollectionEntry<'post'>>
): Array<[string, number]> {
	return [
		...getAllTags(posts).reduce(
			(acc, t) => acc.set(t, (acc.get(t) || 0) + 1),
			new Map<string, number>()
		)
	].sort((a, b) => b[1] - a[1])
}
