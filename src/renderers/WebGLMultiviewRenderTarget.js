import { WebGLRenderTarget } from './WebGLRenderTarget.js';

/**
 * @author Takahiro / http://github.com/takahirox
 */

function WebGLMultiviewRenderTarget( width, height, options ) {

	WebGLRenderTarget.call( this, width, height, options );

}

WebGLMultiviewRenderTarget.prototype = Object.create( WebGLRenderTarget.prototype );
WebGLMultiviewRenderTarget.prototype.constructor = WebGLMultiviewRenderTarget;

WebGLMultiviewRenderTarget.prototype.isWebGLMultiviewRenderTarget = true;


export { WebGLMultiviewRenderTarget };
