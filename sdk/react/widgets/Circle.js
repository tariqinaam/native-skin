'use strict';

var React = require('react-native');
var {
  View,
} = React;

var Circle = React.createClass({
  propTypes: {
    ...View.propTypes,
  },

	render: function() {
		return (<View {...this.props} />);
	},
});

module.exports = Circle;