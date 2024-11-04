import React, { useState } from 'react'

const SimpleExpandableBlock = ({ className, heading, children }) => {
	const [isOpen, setIsOpen] = useState(false)

	const toggleOpen = () => {
		console.log('toggleOpen')

		setIsOpen(!isOpen)
	}

	return (
		<div className={`expandable-block ${className} bg-amber-50 px-4 py-2 text-sm`}>
			<div onClick={toggleOpen} className='expandable-header cursor-pointer'>
				<span className='expandable-icon mr-2 text-xs'>▼</span>
				{heading}
			</div>
			{isOpen && <div className='expandable-content ml-5 mt-2'>{children}Hello</div>}
		</div>
	)
}

export default SimpleExpandableBlock
;<style jsx>{`
	.expandable-block {
		border: 1px solid #ccc;
		border-radius: 8px;
		overflow: hidden;
	}
	.expandable-header {
		padding: 10px;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.expandable-content {
		padding: 10px;
	}
	.expandable-icon {
		font-size: 1.2em;
	}
`}</style>
