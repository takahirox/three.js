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

		for ( var i = 0, il = this.views.length; i < il; i ++ ) {

			this.views[ i ].copy( source.views[ i ] );

		}

		return this;

	},

	setSize: function ( width, height, views ) {

		if ( views === undefined ) {

			views = [];

			for ( var i = 0; i < this.numViews; i ++ ) {

				views[ i ] = new Vector2( width / this.numViews, height );

			}

		}

		var updated = false;

		if ( this.width !== width || this.height !== height ) {

			this.width = width;
			this.height = height;

			updated = true;

		}

		for ( var i = 0; i < this.numViews; i ++ ) {

			if ( ! this.views[ i ].equals( views[ i ] ) ) {

				this.views[ i ].copy( views[ i ] );
				updated = true;

			}

		}

		if ( updated ) {

			this.dispose();

		}

		this.viewport.set( 0, 0, this.views[ 0 ].x, this.views[ 0 ].y );
		this.scissor.set( 0, 0, this.views[ 0 ].x, this.views[ 0 ].y );

	}

} );


export { WebGLMultiviewRenderTarget };
