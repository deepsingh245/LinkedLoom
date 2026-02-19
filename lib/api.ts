import * as FirebaseAuth from './firebase/auth';
import * as FirebasePosts from './firebase/posts';
import * as FirebaseUtils from './firebase/utils';
import * as FirebaseAnalytics from './firebase/analytics';

export const api = {
  firebaseService: {
    ...FirebaseUtils,
    ...FirebaseAuth,
    ...FirebasePosts,
    ...FirebaseAnalytics,
  },
};