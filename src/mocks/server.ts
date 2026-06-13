import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** Node MSW server for tests — shares the same handlers as the browser worker. */
export const server = setupServer(...handlers);
