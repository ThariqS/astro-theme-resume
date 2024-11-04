import 'katex/dist/katex.min.css'
import pkg from 'react-katex'
const { InlineMath, BlockMath } = pkg
export default function Math({ math }) {
	return (
		<BlockMath className='my-10 w-full border-4 border-sky-500 bg-sky-950 p-6 text-lg text-sky-100'>
			{math}
		</BlockMath>
	)
}
