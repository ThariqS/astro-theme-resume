import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'
import { remarkReadingTime } from './src/utils/remarkReadingTime.ts'
import remarkUnwrapImages from 'remark-unwrap-images'
import rehypeExternalLinks from 'rehype-external-links'
import expressiveCode from 'astro-expressive-code'
import { expressiveCodeOptions } from './src/site.config'
import icon from 'astro-icon'

import vercel from '@astrojs/vercel/serverless'

import react from '@astrojs/react';

import { rehypeHeadingIds } from '@astrojs/markdown-remark';

// https://astro.build/config
export default defineConfig({
    site: 'https://www.thariq.io',
    integrations: [
        mdx({
            components: {
                a: './src/components/Link.astro'
            }
        }),
        tailwind({
            applyBaseStyles: false
        }),
        sitemap(),
        icon(),
        react()
    ],
    markdown: {
        remarkPlugins: [remarkUnwrapImages, remarkReadingTime],
        rehypePlugins: [
            rehypeHeadingIds,
        ],
        remarkRehype: {
            footnoteLabelProperties: {
                className: ['']
            }
        },
        components: {
            a: './src/components/Link.astro'
        }
    },
    prefetch: true,
    output: 'server',
    adapter: vercel({
        webAnalytics: { enabled: true }
    })
})
