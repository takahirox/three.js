/**
 * @author fernandojsg / http://fernandojsg.com
 * @author Takahiro / https://github.com/takahirox
 */

import { WebGLMultiviewRenderTarget } from '../WebGLMultiviewRenderTarget.js';
import { Vector2 } from '../../math/Vector2.js';
import { Matrix3 } from '../../math/Matrix3.js';
import { Matrix4 } from '../../math/Matrix4.js';

function WebGLMultiview( renderer, extensions, capabilities, properties ) {

	var gl = renderer.context;

	var available = capabilities.multiview;
	var maxNumViews = capabilities.maxMultiviewViews;
	var enabled = available;
	var renderTarget = new WebGLMultiviewRenderTarget( 0, 0, 2 );
	var currentRenderTarget;
	var renderSize = new Vector2();

	// 
	var array = [];
	var vector2s = [];
	var matrix3s = [];
	var matrix4s = [];

	function getNumViews() {

		return renderTarget.numViews;

	}

	function getCameraArray( camera ) {

		if ( camera.isArrayCamera ) return camera.cameras;

		array[ 0 ] = camera;

		return array;

	}

	function getViewArray( length ) {

		if ( vector2s.length < length ) {

			for ( var i = vector2s.length; i < length; i ++ ) {

				vector2s[ i ] = new Vector2();

			}

		}

		return vector2s;

	}

	function getMatrix3s( length ) {

		if ( matrix3s.length < length ) {

			for ( var i = matrix3s.length; i < length; i ++ ) {

				matrix3s[ i ] = new Matrix3();

			}

		}

		return matrix3s;

	}

	function getMatrix4s( length ) {

		if ( matrix4s.length < length ) {

			for ( var i = matrix4s.length; i < length; i ++ ) {

				matrix4s[ i ] = new Matrix4();

			}

		}

		return matrix4s;

	}

	function updateProjectionMatricesUniform( camera, p_uniforms ) {

		var numViews = getNumViews();
		var matrices = getMatrix4s( numViews );
		var cameras = getCameraArray( camera );

		for ( var i = 0; i < numViews; i ++ ) {

			var cameraIndex = i < cameras.length ? i : cameras.length - 1;

			matrices[ i ].copy( cameras[ cameraIndex ].projectionMatrix );

		}

		p_uniforms.setValue( gl, 'projectionMatrices', matrices );

	}

	function updateViewMatricesUniform( camera, p_uniforms ) {

		var numViews = getNumViews();
		var matrices = getMatrix4s( numViews );
		var cameras = getCameraArray( camera );

		for ( var i = 0; i < numViews; i ++ ) {

			var cameraIndex = i < cameras.length ? i : cameras.length - 1;

			matrices[ i ].copy( cameras[ cameraIndex ].matrixWorldInverse );

		}

		p_uniforms.setValue( gl, 'viewMatrices', matrices );

	}

	function updateObjectMatricesUniform( object, camera, p_uniforms ) {

		var numViews = getNumViews();
		var modelViewMatrices = getMatrix4s( numViews );
		var normalMatrices = getMatrix3s( numViews );
		var cameras = getCameraArray( camera );

		for ( var i = 0; i < numViews; i ++ ) {

			var cameraIndex = i < cameras.length ? i : cameras.length - 1;

			modelViewMatrices[ i ].multiplyMatrices( cameras[ cameraIndex ].matrixWorldInverse, object.matrixWorld );
			normalMatrices[ i ].getNormalMatrix( modelViewMatrices[ i ] );

		}

		p_uniforms.setValue( gl, 'modelViewMatrices', modelViewMatrices );
		p_uniforms.setValue( gl, 'normalMatrices', normalMatrices );

	}

	function resizeRenderTarget( camera ) {

		renderer.getDrawingBufferSize( renderSize );

		var numViews = getNumViews();
		var views = getViewArray( numViews );

		if ( camera.isArrayCamera ) {

			for ( var i = 0; i < numViews; i ++ ) {

				var bounds = camera.cameras[ i ].bounds;

				var width = bounds.z * renderSize.x;
				var height = bounds.w * renderSize.y;

				views[ i ].set( width, height );

			}

		} else {

			views[ 0 ].set( renderSize.x, renderSize.y ) ;

			for ( var i = 1; i < numViews; i ++ ) {

				views[ i ].set( 0, 0 );

			}

		}

		renderTarget.setSize( renderSize.x, renderSize.y, views );

	}

	function overrideRenderTarget( camera ) {

		currentRenderTarget = renderer.getRenderTarget();
		resizeRenderTarget( camera );
		renderer.setRenderTarget( renderTarget );

	}

	function flush() {

		var dstRenderTarget = currentRenderTarget;
		var dstFramebuffer = dstRenderTarget ? properties.get( dstRenderTarget ).__webglFramebuffer : renderer.getFramebuffer();

		var srcFramebuffers = properties.get( renderTarget ).__webglViewFramebuffers;
		var views = renderTarget.views;

		// @TODO
		gl.bindFramebuffer( gl.FRAMEBUFFER, dstFramebuffer );

		var widthOffset = 0;

		for ( var i = 0, il = views.length; i < il; i ++ ) {

			var view = views[ i ];
			var width = view.x;
			var height = view.y;

			if ( width === 0 || height === 0 ) continue;

			var srcFramebuffer = srcFramebuffers[ i ];

			gl.bindFramebuffer( gl.READ_FRAMEBUFFER, srcFramebuffer );
			gl.blitFramebuffer( 0, 0, width, height, widthOffset, 0, widthOffset + width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST );

			widthOffset += width;

		}

		renderer.setRenderTarget( currentRenderTarget );

	}

	this.enabled = enabled;
	this.overrideRenderTarget = overrideRenderTarget;
	this.flush = flush;
	this.updateProjectionMatricesUniform = updateProjectionMatricesUniform;
	this.updateViewMatricesUniform = updateViewMatricesUniform;
	this.updateObjectMatricesUniform = updateObjectMatricesUniform;

}

export { WebGLMultiview };
