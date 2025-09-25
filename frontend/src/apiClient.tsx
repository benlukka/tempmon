import { DefaultApi, Configuration } from './generated';

const basePath = process.env.REACT_APP_API_BASE_URL || 'http://localhost:9247';

export const apiClient = new DefaultApi(new Configuration({ basePath }));