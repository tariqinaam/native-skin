package com.ooyala.android.skin;

import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.MotionEvent;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.common.SystemClock;
import com.ooyala.android.OoyalaPlayer;
import com.ooyala.android.discovery.DiscoveryManager;
import com.ooyala.android.item.Video;
import com.ooyala.android.util.DebugMode;

import static com.facebook.react.bridge.UiThreadUtil.runOnUiThread;

/**
 * This class handles all of the events that can come from the React Bridge, and performs all of the necessary actions
 */
class OoyalaSkinBridgeEventHandlerImpl implements BridgeEventHandler {
  private static String TAG = OoyalaSkinBridgeEventHandlerImpl.class.getSimpleName();
  private static final String BUTTON_PLAYPAUSE = "PlayPause";
  private static final String BUTTON_PLAY = "Play";
  private static final String BUTTON_SHARE = "Share";
  private static final String BUTTON_REWIND = "rewind";
  private static final String BUTTON_SOCIALSHARE = "SocialShare";
  private static final String BUTTON_FULLSCREEN = "Fullscreen";
  private static final String BUTTON_LEARNMORE = "LearnMore";
  private static final String BUTTON_MORE_OPTION = "More";
  private static final String BUTTON_UPNEXT_DISMISS = "upNextDismiss";
  private static final String BUTTON_UPNEXT_CLICK = "upNextClick";
  private static final String BUTTON_SKIP = "Skip";
  private static final String BUTTON_ADICON = "Icon";
  private static final String BUTTON_ADOVERLAY = "Overlay";
  private static final String BUTTON_STEREOSCOPIC = "stereoscopic";

  private OoyalaSkinLayoutController _layoutController;
  private OoyalaPlayer _player;

  public OoyalaSkinBridgeEventHandlerImpl(OoyalaSkinLayoutController layoutController, OoyalaPlayer player) {
    _layoutController = layoutController;
    _player = player;
  }

  @Override
  public void onMounted() {
    DebugMode.logD(TAG, "onMounted");
    _layoutController.updateBridgeWithCurrentState();
  }

  public void onPress(final ReadableMap parameters) {
    final String buttonName = parameters.hasKey("name") ? parameters.getString("name") : null;
    if (buttonName != null) {
      DebugMode.logD(TAG, "onPress with buttonName:" + buttonName);
      new Handler(Looper.getMainLooper()).post(new Runnable() {
        @Override
        public void run() {
          if (buttonName.equals(BUTTON_PLAY)) {
            _layoutController.handlePlay();
          } else if (buttonName.equals(BUTTON_PLAYPAUSE)) {
            _layoutController.handlePlayPause();
          } else if (buttonName.equals(BUTTON_REWIND)) {
            handleRewind();
          } else if (buttonName.equals(BUTTON_FULLSCREEN)) {
            _layoutController.setFullscreen(!_layoutController.isFullscreen());
          } else if (buttonName.equals(BUTTON_SHARE)) {
            _layoutController.handleShare();
          } else if (buttonName.equals(BUTTON_LEARNMORE)) {
            _layoutController.handleLearnMore();
          } else if (buttonName.equals(BUTTON_UPNEXT_DISMISS)) {
            _layoutController.handleUpNextDismissed();
          } else if (buttonName.equals(BUTTON_UPNEXT_CLICK)) {
            _layoutController.maybeStartUpNext();
          } else if (buttonName.equals(BUTTON_SKIP)) {
            _layoutController.handleSkip();
          } else if (buttonName.equals(BUTTON_ADICON)) {
            String index = parameters.getString("index");
            DebugMode.logD(TAG, "onIconClicked with index " + index);
            _layoutController.handleAdIconClick(Integer.parseInt(index));
          } else if (buttonName.equals(BUTTON_ADOVERLAY)) {
            String clickUrl = parameters.getString("clickUrl");
            _player.onAdOverlayClicked(clickUrl);
          } else if (buttonName.equals(BUTTON_STEREOSCOPIC)) {
            _player.switchVRMode();
          }
        }
      });
    }
  }

  public void shareTitle(ReadableMap parameters) {
    _layoutController.shareTitle = parameters.getString("shareTitle");
  }

  public void shareUrl(ReadableMap parameters) {
    _layoutController.shareUrl = parameters.getString("shareUrl");
  }

  public void handleRewind() {
    int playheadTime = _player.getPlayheadTime();
    System.out.println("in rewind time" + playheadTime);
    playheadTime = playheadTime - 10000;
    System.out.println("in rewind time after -30 is " + playheadTime);
    _player.seek(playheadTime);
  }

  public void onScrub(ReadableMap percentage) {
    double percentValue = percentage.getDouble("percentage");
    percentValue = percentValue * 100.0f; // percentage * 100 so it can deal fine with milliseconds
    float percent =  (float) percentValue;
    _player.seekToPercent(percent);
  }

  public void onDiscoveryRow(ReadableMap parameters) {
    String android_id = Settings.Secure.getString(_layoutController.getLayout().getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
    String bucketInfo = parameters.getString("bucketInfo");
    String action = parameters.getString("action");
    final String embedCode = parameters.getString("embedCode");
    if (action.equals("click")) {
      DiscoveryManager.sendClick(_layoutController.discoveryOptions, bucketInfo, _player.getPcode(), android_id, null, _layoutController);
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          DebugMode.logD(TAG, "playing discovery video with embedCode " + embedCode);
          _player.setEmbedCode(embedCode);
          _player.play();
        }
      });
    } else if (action.equals("impress")) {
      DiscoveryManager.sendImpression(_layoutController.discoveryOptions, bucketInfo, _player.getPcode(), android_id, null, _layoutController);
    }
  }

  public void onLanguageSelected(ReadableMap parameters) {
    String languageName = parameters.getString("language");
    String languageCode = languageName;
    if (_player != null && _player.getCurrentItem() != null) {
      languageCode = _player.getCurrentItem().getLanguageCodeFor(languageName);
      _player.setClosedCaptionsLanguage(languageCode);
    }
  }

  @Override
  public void handleTouchStart(ReadableMap parameters) {
    createMotionEventAndPassThrough(parameters, MotionEvent.ACTION_DOWN);
  }

  @Override
  public void handleTouchMove(ReadableMap parameters) {
    createMotionEventAndPassThrough(parameters, MotionEvent.ACTION_MOVE);
  }

  @Override
  public void handleTouchEnd(ReadableMap parameters) {
    createMotionEventAndPassThrough(parameters, MotionEvent.ACTION_UP);
  }

  @Override
  public void onAudioTrackSelected(ReadableMap parameters) {
    _player.setUserDefinedAudioTrack(parameters.getString("audioTrack"));
  }

  private void createMotionEventAndPassThrough(ReadableMap params, int action) {
    final boolean isClicked = params.getBoolean("isClicked");
    final float xLocation = (float) params.getDouble("x_location");
    final float yLocation = (float) params.getDouble("y_location");
    final long timestampTouchStart = (long) params.getDouble("touchTime");
    final long timestampTouchEnd = SystemClock.uptimeMillis();
    final int metastats = 0;
    MotionEvent event = MotionEvent.obtain(timestampTouchStart, timestampTouchEnd, action, xLocation, yLocation, metastats);
    _player.passTouchEventToVRView(event, !isClicked);
  }
}
