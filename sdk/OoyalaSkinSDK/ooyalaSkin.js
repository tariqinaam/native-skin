/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
var React = require('react-native');
var {
  ActivityIndicatorIOS,
  AppRegistry,
  DeviceEventEmitter,
  SliderIOS,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableHighlight,
} = React;

var eventBridge = require('NativeModules').OOReactBridge;
var StartScreen = require('./StartScreen');
var EndScreen = require('./EndScreen');
var PauseScreen = require('./PauseScreen');
var DiscoveryPanel = require('./discoveryPanel');

var Constants = require('./constants');
var {
  ICONS,
  BUTTON_NAMES,
  SCREEN_TYPES,
  OOSTATES,
} = Constants;
var VideoView = require('./videoView');

var OoyalaSkin = React.createClass({

  // rct_ naming means it is only kept on the react side of the bridge.
  getInitialState() {
    return {
      screenType: SCREEN_TYPES.START_SCREEN,
      title: 'video title', 
      description: 'this is the detail of the video', 
      promoUrl: '', 
      playhead: 0,
      duration: 1,
      rate: 0,
      // things which default to 'falsy' and thus don't have to be stated:
      // rct_closedCaptionsLanguage: null,
      // showClosedCaptionsButton: false,
      // availableClosedCaptionsLanguages: false,
      // captionJSON: null,
    };
  },

  handleClosedCaptionsButtonPress: function(n) {
    var consume = n === BUTTON_NAMES.CLOSED_CAPTIONS;
    if( consume ) {
      eventBridge.onAvailableClosedCaptionLanguagesRequest();
    }
    return consume;
  },

  handlePress: function(n) {
    if( ! this.handleClosedCaptionsButtonPress(n) ) {
      eventBridge.onPress({name:n});
    }
  },

  handleScrub: function(value) {
    eventBridge.onScrub({percentage:value});
  },

  onClosedCaptionUpdate: function(e) {
    this.setState( {captionJSON: e} );
  },

  onAvailableClosedCaptionLanguages : function(e) {
    this.setState( {availableClosedCaptionsLanguages: e.languages} );
    if( e.languages ) {
      // todo: remove this testing hack and do it right...
      var ccl = (this.state.rct_closedCaptionsLanguage ? null : e.languages[0]);
      this.setState({rct_closedCaptionsLanguage: ccl});
      // todo: ...remove this testing hack and do it right.
    }
  },

  handleEmbedCode: function(code) {
    eventBridge.setEmbedCode({embedCode:code});
  },

  onTimeChange: function(e) { // todo: naming consistency? playheadUpdate vs. onTimeChange vs. ...
    console.log( "onTimeChange: " + e.rate + ", " + (e.rate>0) );
    if (e.rate > 0) {
      this.setState({screenType: SCREEN_TYPES.VIDEO_SCREEN});
    }
    this.setState({
      playhead: e.playhead,
      duration: e.duration,
      rate: e.rate,
      showClosedCaptionsButton: e.showClosedCaptionsButton,
    });
    this.updateClosedCaptions();
  },

  updateClosedCaptions: function() {
    eventBridge.onClosedCaptionUpdateRequested( {language:this.state.rct_closedCaptionsLanguage} );
  },

  onCurrentItemChange: function(e) {
    console.log("currentItemChangeReceived, promoUrl is " + e.promoUrl);
    this.setState({screenType:SCREEN_TYPES.START_SCREEN, title:e.title, description:e.description, duration:e.duration, promoUrl:e.promoUrl, width:e.width});
  },

  onFrameChange: function(e) {
    console.log("receive frameChange, frame width is" + e.width + " height is" + e.height);
    this.setState({width:e.width});
  },

  onPlayComplete: function(e) {
    this.setState({screenType: SCREEN_TYPES.END_SCREEN});
  },

  onStateChange: function(e) {
    if(e.state == OOSTATES.PAUSED) {
      this.setState({screenType:SCREEN_TYPES.PAUSE_SCREEN});
    }
  },

  onDiscoveryResult: function(e) {
    console.log("onDiscoveryResult results are:", e.results);
    this.setState({discovery:e.results});
  },

  componentWillMount: function() {
    console.log("componentWillMount");
    this.listeners = [];
    var listenerDefinitions = [
      [ 'timeChanged',              (event) => this.onTimeChange(event) ],
      [ 'currentItemChanged',       (event) => this.onCurrentItemChange(event) ],
      [ 'frameChanged',             (event) => this.onFrameChange(event) ],
      [ 'playCompleted',            (event) => this.onPlayComplete(event) ],
      [ 'stateChanged',             (event) => this.onStateChange(event) ],
      [ 'discoveryResultsReceived', (event) => this.onDiscoveryResult(event) ],
      [ 'onClosedCaptionUpdate',    (event) => this.onClosedCaptionUpdate(event) ],
      [ 'onAvailableClosedCaptionLanguages', (event) => this.onAvailableClosedCaptionLanguages(event) ],
    ];
    for( var d of listenerDefinitions ) {
      this.listeners.push( DeviceEventEmitter.addListener( d[0], d[1] ) );
    }
  },

  componentWillUnmount: function() {
    for( var l of this.listeners ) {
      l.remove;
    }
    this.listeners = [];
  },

  render: function() {
    switch (this.state.screenType) {
      case SCREEN_TYPES.START_SCREEN: return this._renderStartScreen(); break;
      case SCREEN_TYPES.END_SCREEN:   return this._renderEndScreen();   break;
      case SCREEN_TYPES.PAUSE_SCREEN: return this._renderPauseScreen(); break;
      default:      return this._renderVideoView();   break;
    }
  },

  _renderStartScreen: function() {
    var startScreenConfig = {mode:'default', infoPanel:{visible:true}};
    return (
      <StartScreen
        config={startScreenConfig}
        title={this.state.title}
        description={this.state.description}
        promoUrl={this.state.promoUrl}
        onPress={(name) => this.handlePress(name)}/>
    );
  },

  _renderEndScreen: function() {
    var EndScreenConfig = {mode:'default', infoPanel:{visible:true}};
    return (
      <EndScreen
        config={EndScreenConfig}
        title={this.state.title}
        description={this.state.description}
        promoUrl={this.state.promoUrl}
        duration={this.state.duration}
        onPress={(name) => this.handlePress(name)}/>
    );
  },

  _renderPauseScreen: function() {
    var PauseScreenConfig = {mode:'default', infoPanel:{visible:true}};

    return (
      <PauseScreen
        config={PauseScreenConfig}
        title={this.state.title}
        duration={this.state.duration}
        description={this.state.description}
        promoUrl={this.state.promoUrl}
        onPress={(name) => this.handlePress(name)}/>
    );
  },

   _renderVideoView: function() {
     var showPlayButton = this.state.rate > 0 ? false : true;
     var discovery;
     if (this.state.rate == 0) {
      discovery = this.state.discovery;
     }
     // todo: presumably, do not show CC when Discovery is on.
     return (
       <VideoView
         showPlay={showPlayButton}
         playhead={this.state.playhead}
         duration={this.state.duration}
         discovery={discovery} 
         width={this.state.width}
         onPress={(value) => this.handlePress(value)}
         onScrub={(value) => this.handleScrub(value)}
         closedCaptionsLanguage={this.state.rct_closedCaptionsLanguage}
         showClosedCaptionsButton={this.state.showClosedCaptionsButton}
         captionJSON={this.state.captionJSON}
         onDiscoveryRow={(code) => this.handleEmbedCode(code)}>
       </VideoView>
     );
   }
});

AppRegistry.registerComponent('OoyalaSkin', () => OoyalaSkin);

