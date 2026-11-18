import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: ({ browser }) => ({
    name: 'Focus Button for YouTube',
    description:
      'Hide comments, related videos, home recommendations, and notifications with one click.',
    permissions: ['storage'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: '{e7614af5-2db1-4ec8-995a-445a29cb6ddf}',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          },
        }
      : {}),
  }),
});
