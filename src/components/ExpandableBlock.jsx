import React, { useState } from 'react'

const ExpandableBlock = ({ heading, children }) => {
	const [isOpen, setIsOpen] = useState(false)

	const toggleOpen = () => {
		console.log('toggleOpen')
		setIsOpen(!isOpen)
	}

	return (
		<div className='expandable-block bg-amber-50 px-4 py-2 text-sm'>
			<div onClick={toggleOpen} className='expandable-header cursor-pointer'>
				<span className='expandable-icon mr-2 text-xs'>▼</span>
				{heading}
			</div>
			{isOpen && (
				<div className='expandable-content ml-5 mt-2'>
					<p>
						Anthropic has open sourced a Docker Container & Virtual Machine for testing the{' '}
						<a
							href='https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo'
							target='_blank'
						>
							Anthropic Computer Use API
						</a>
						.
					</p>

					<p>
						I found that I wante to test on my actual machine, so I{' '}
						<a href='https://github.com/ThariqS/Clade-Computer-Use-Mac' target='_blank'>
							open sourced
						</a>{' '}
						the Electron Mac application I used to test Claude Computer Use. It includes significant
						changes to its system prompts and tools.
					</p>
				</div>
			)}
		</div>
	)
}

export default ExpandableBlock
;<style jsx>{`
	.expandable-block {
		border: 1px solid #ccc;
		border-radius: 8px;
		overflow: hidden;
	}
	.expandable-header {
		background-color: #f7f7f7;
		padding: 10px;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.expandable-content {
		padding: 10px;
		background-color: #fff;
	}
	.expandable-icon {
		font-size: 1.2em;
	}
`}</style>
