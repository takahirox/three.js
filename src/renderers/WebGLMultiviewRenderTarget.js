import { WebGLRenderTarget } from './WebGLRenderTarget.js';
import { Vector2 } from '../math/Vector2.js';

/**
 * @author Takahiro / https://github.com/takahirox
 */

function WebGLMultiviewRenderTarget( width, height, numViews, options ) {

	WebGLRenderTarget.call( this, width, height, options );

	this.numViews = numViews;

	this.views = [];

	for ( var i = 0; i < numViews; i ++ ) {

		this.views.push( new Vector2( width, height ) );

	}

	this.depthBuffer = false;
	this.stencilBuffer = false;

}

WebGLMultiviewRenderTarget.prototype = Object.assign( Object.create( WebGLRenderTarget.prototype ), {

	constructor: WebGLMultiviewRenderTarget,

	isWebGLMultiviewRenderTarget: true,

	copy: function ( source ) {

		WebGLRenderTarget.prototype.copy.call( this, source );

		this.numViews = source.numViews;

		return this;

	}

} );


export { WebGLMultiviewRenderTarget };
