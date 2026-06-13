import { http, HttpResponse } from 'msw';

import { posts } from './data/posts';

export const handlers = [http.get('/api/posts', () => HttpResponse.json({ posts }))];
