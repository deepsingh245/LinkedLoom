import * as FirebaseAuth from './firebase/auth';
import * as FirebasePosts from './firebase/posts';
import * as FirebaseAnalytics from './firebase/analytics';
import * as FirebaseIntegrations from './firebase/integrations';
import * as FirebaseAutopilot from './firebase/autopilot';
import * as FirebaseAI from './firebase/ai';
import * as FirebaseResearch from './firebase/research';
import * as FirebaseContext from './firebase/context';
import * as FirebasePublishing from './firebase/publishing';

export const api = {
  firebaseService: {
    ...FirebaseAuth,
    ...FirebasePosts,
    ...FirebaseAnalytics,
    ...FirebaseIntegrations,
    ...FirebaseAutopilot,
    ...FirebaseAI,
    ...FirebaseResearch,
    ...FirebaseContext,
    ...FirebasePublishing,
  },
};