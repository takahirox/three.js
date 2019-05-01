/**
 * @author fernandojsg / http://fernandojsg.com
 * @author Takahiro / https://github.com/takahirox
 */

import { WebGLMultiviewRenderTarget } from '../WebGLMultiviewRenderTarget.js';
import { Vector2 } from '../../math/Vector2.js';
import { Vector4 } from '../../math/Vector4.js';
import { Matrix3 } from '../../math/Matrix3.js';
import { Matrix4 } from '../../math/Matrix4.js';

function WebGLMultiview( renderer, extensions, capabilities, properties ) {

	var gl = renderer.context;

	var available = capabilities.multiview;
	var maxNumViews = capabilities.maxMultiviewViews;

	var renderTarget = new WebGLMultiviewRenderTarget( 0, 0, 2 );
	var currentRenderTarget;
	var renderSize = new Vector2();

	var cameraArray = [];
	var matrix3s = [];
	var matrix4s = [];

	for ( var i = 0; i < maxNumViews; i ++ ) {

		matrix3s[ i ] = new Matrix3();
		matrix4s[ i ] = new Matrix4();

	}

	function getCameraArray( camera ) {

		if ( camera.isArrayCamera ) return camera.cameras;

		cameraArray[ 0 ] = camera;

		return cameraArray;

	}

	function updateProjectionMatricesUniform( camera, p_uniforms ) {

		var numViews = getNumViews();
		var matrices = matrix4s;
		var cameras = getCameraArray( camera );

		for ( var i = 0; i < numViews; i ++ ) {

			var cameraIndex = i < cameras.length ? i : cameras.length - 1;

			matrices[ i ].copy( cameras[ cameraIndex ].projectionMatrix );

		}

		p_uniforms.setValue( gl, 'projectionMatrices', matrices );

	}

	function updateViewMatricesUniform( camera, p_uniforms ) {

		var numViews = getNumViews();
		var matrices = matrix4s;
		var cameras = getCameraArray( camera );

		for ( var i = 0; i < numViews; i ++ ) {

			var cameraIndex = i < cameras.length ? i : cameras.length - 1;

			matrices[ i ].copy( cameras[ cameraIndex ].matrixWorldInverse );

		}

		p_uniforms.setValue( gl, 'viewMatrices', matrices );

	}

	function updateObjectMatricesUniform( object, camera, p_uniforms ) {

		var numViews = getNumViews();
		var modelViewMatrices = matrix4s;
		var normalMatrices = matrix3s;
		var cameras = getCameraArray( camera );

		for ( var i = 0; i < numViews; i ++ ) {

			var cameraIndex = i < cameras.length ? i : cameras.length - 1;

			modelViewMatrices[ i ].multiplyMatrices( cameras[ cameraIndex ].matrixWorldInverse, object.matrixWorld );
			normalMatrices[ i ].getNormalMatrix( modelViewMatrices[ i ] );

		}

		p_uniforms.setValue( gl, 'modelViewMatrices', modelViewMatrices );
		p_uniforms.setValue( gl, 'normalMatrices', normalMatrices );

	}

	//

	function getNumViews() {

		return renderTarget.numViews;

	}

	function isMultiviewUsable( camera ) {

		if ( ! camera.isArrayCamera ) return true;

		var cameras = camera.cameras;

		if ( cameras.length > maxNumViews ) return false;

		for ( var i = 1, il = cameras.length; i < il; i ++ ) {

			if ( cameras[ 0 ].bounds.z !== cameras[ i ].bounds.z ||
				cameras[ 0 ].bounds.w !== cameras[ i ].bounds.w ) return false;

		}

		return true;

	}

	function resizeRenderTarget( camera ) {

		if ( currentRenderTarget ) {

			renderSize.set( currentRenderTarget.width, currentRenderTarget.height );

		} else {

			renderer.getDrawingBufferSize( renderSize );

		}

		if ( camera.isArrayCamera ) {

			var bounds = camera.cameras[ 0 ].bounds;

			renderTarget.setSize( bounds.z * renderSize.x, bounds.w * renderSize.y );
			renderTarget.setNumViews( camera.cameras.length );

		} else {

			renderTarget.setSize( renderSize.x, renderSize.y );
			renderTarget.setNumViews( 2 );

		}

	}

	function attachRenderTarget( camera ) {

		if ( ! isMultiviewUsable( camera ) ) return;

		currentRenderTarget = renderer.getRenderTarget();
		resizeRenderTarget( camera );
		renderer.setRenderTarget( renderTarget );

	}

	function detachRenderTarget( camera ) {

		if ( renderTarget !== renderer.getRenderTarget() ) return false;

		renderer.setRenderTarget( currentRenderTarget );
		flush( camera );

	}

	function flush( camera ) {

		var srcRenderTarget = renderTarget;
		var numViews = srcRenderTarget.numViews;

		var srcFramebuffers = properties.get( srcRenderTarget ).__webglViewFramebuffers;

		var viewWidth = srcRenderTarget.width;
		var viewHeight = srcRenderTarget.height;

		if ( camera.isArrayCamera ) {

			var cameras = camera.cameras;

			for ( var i = 0; i < numViews; i ++ ) {

				var bounds = camera.cameras[ i ].bounds;

				var x1 = bounds.x * renderSize.x;
				var y1 = bounds.y * renderSize.y;
				var x2 = x1 + bounds.z * renderSize.x;
				var y2 = y1 + bounds.w * renderSize.y;

				gl.bindFramebuffer( gl.READ_FRAMEBUFFER,  srcFramebuffers[ i ] );
				gl.blitFramebuffer( 0, 0, viewWidth, viewHeight, x1, y1, x2, y2, gl.COLOR_BUFFER_BIT, gl.NEAREST );

			}

		} else {

			gl.bindFramebuffer( gl.READ_FRAMEBUFFER,  srcFramebuffers[ 0 ] );
			gl.blitFramebuffer( 0, 0, viewWidth, viewHeight, 0, 0, renderSize.x, renderSize.y, gl.COLOR_BUFFER_BIT, gl.NEAREST );

		}

	}

	this.available = available;
	this.attachRenderTarget = attachRenderTarget;
	this.detachRenderTarget = detachRenderTarget;
	this.updateProjectionMatricesUniform = updateProjectionMatricesUniform;
	this.updateViewMatricesUniform = updateViewMatricesUniform;
	this.updateObjectMatricesUniform = updateObjectMatricesUniform;

}

export { WebGLMultiview };
