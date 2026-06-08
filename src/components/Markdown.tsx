'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ContentCopyOutlined, CheckOutlined } from '@mui/icons-material';

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = extractText(children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <Box sx={{ position: 'relative', '&:hover .flux-copy': { opacity: 1 } }}>
      <Tooltip title={copied ? 'Copied' : 'Copy'}>
        <IconButton
          className="flux-copy"
          size="small"
          onClick={handleCopy}
          sx={{
            position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.15s',
            color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)', color: 'text.primary' },
          }}
        >
          {copied ? <CheckOutlined sx={{ fontSize: 14 }} /> : <ContentCopyOutlined sx={{ fontSize: 14 }} />}
        </IconButton>
      </Tooltip>
      <pre>{children}</pre>
    </Box>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

const Markdown = React.memo(function Markdown({ children }: { children: string }) {
  return (
    <Box className="flux-markdown" sx={{ fontSize: 14.5, lineHeight: 1.65, color: 'text.primary' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ pre: CodeBlock }}
      >
        {children}
      </ReactMarkdown>
    </Box>
  );
});

export default Markdown;
