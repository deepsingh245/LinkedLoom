import * as FirebaseAuth from './firebase/auth';
import * as FirebasePosts from './firebase/posts';
import * as FirebaseAnalytics from './firebase/analytics';
import * as FirebaseIntegrations from './firebase/integrations';

export const api = {
  firebaseService: {
    ...FirebaseAuth,
    ...FirebasePosts,
    ...FirebaseAnalytics,
    ...FirebaseIntegrations,
  },
};