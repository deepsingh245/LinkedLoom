import * as FirebaseAuth from './firebase/auth';
import * as FirebasePosts from './firebase/posts';
import * as FirebaseAnalytics from './firebase/analytics';
import * as FirebaseIntegrations from './firebase/integrations';
import * as FirebaseAutopilot from './firebase/autopilot';

export const api = {
  firebaseService: {
    ...FirebaseAuth,
    ...FirebasePosts,
    ...FirebaseAnalytics,
    ...FirebaseIntegrations,
    ...FirebaseAutopilot,
  },
};