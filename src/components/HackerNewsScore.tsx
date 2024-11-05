import React, { useState, useEffect } from 'react'

const HackerNewsScore = ({ id, className }: { id: string, className?: string }) => {
	const [storyData, setStoryData] = useState<any | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchStoryData = async () => {
			try {
				const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
				const data = await response.json()
				setStoryData(data)
				setLoading(false)
			} catch (err) {
				setError('Failed to fetch story data')
				setLoading(false)
			}
		}

		fetchStoryData()
	}, [id])

	return (
		<div className={`inline-block font-mono ${className || ''}`}>
			{loading ? (
				<div className="text-gray-500 text-xxs">Loading story data...</div>
			) : error ? (
				<div className="text-red-500 text-xxs">{error}</div>
			) : (
				<a 
					href={`https://news.ycombinator.com/item?id=${id}`}
					target="_blank"
					rel="noopener noreferrer"
					className="block hover:no-underline w-[200px] flex flex-row"
				>
					<div className="bg-[#ff6600] text-white px-2 py-1 text-xxs inline-block border border-[#ff6600]">
						HN
					</div>
					<div className="inline-block bg-[#f6f6ef] border border-[#ff6600] px-2 py-1 text-xxs w-full">
						<span>{storyData.score} points</span>
						<span className="mx-1">•</span>
						<span>{storyData.descendants || 0} comments</span>
					</div>
				</a>
			)}
		</div>
	)
}

export default HackerNewsScore
