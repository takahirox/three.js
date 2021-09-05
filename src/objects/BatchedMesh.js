import { Mesh } from './Mesh.js';
import { BufferAttribute } from '../core/BufferAttribute.js';
import { BufferGeometry } from '../core/BufferGeometry.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Sphere } from '../math/Sphere.js';
import { DataTexture } from '../textures/DataTexture.js';
import * as MathUtils from '../math/MathUtils.js';
import { RGBAFormat, FloatType } from '../constants.js';

const _identityMatrix = /*@__PURE__*/ new Matrix4();
const _matrix = /*@__PURE__*/ new Matrix4();
const _sphere = /*@__PURE__*/ new Sphere();

// Arbitary numbers
const DEFAULT_MAX_GEOMETRY_COUNT = 256;
const DEFAULT_MAX_VERTEX_COUNT = 1024 * 256;
const DEFAULT_MAX_INDEX_COUNT = 1024 * 256;

class BatchedMesh extends Mesh {

	constructor( material, maxGeometryCount = DEFAULT_MAX_GEOMETRY_COUNT,
		maxVertexCount = DEFAULT_MAX_VERTEX_COUNT, maxIndexCount = DEFAULT_MAX_INDEX_COUNT ) {

		super( new BufferGeometry(), material );

		this._drawStarts = [];
		this._drawCounts = [];

		this._boundingSpheres = [];
		this._visibilities = [];
		this._inViewports = [];

		this._maxGeometryCount = maxGeometryCount;
		this._maxVertexCount = maxVertexCount;
		this._maxIndexCount = maxIndexCount;

		this._currentGeometryCount = 0;
		this._currentVertexCount = 0;
		this._currentIndexCount = 0;

		this.matrices = null;
		this.matricesTexture = null;
		this.matricesTextureSize = null;

		this._init();

	}

	_init() {

		// @TODO: Implement

		// layout (1 matrix = 4 pixels)
		//      RGBA RGBA RGBA RGBA (=> column1, column2, column3, column4)
		//  with  8x8  pixel texture max   16 matrices * 4 pixels =  (8 * 8)
		//       16x16 pixel texture max   64 matrices * 4 pixels = (16 * 16)
		//       32x32 pixel texture max  256 matrices * 4 pixels = (32 * 32)
		//       64x64 pixel texture max 1024 matrices * 4 pixels = (64 * 64)

		let size = Math.sqrt( this._maxGeometryCount * 4 ); // 4 pixels needed for 1 matrix
		size = MathUtils.ceilPowerOfTwo( size );
		size = Math.max( size, 4 );

		const matricesArray = new Float32Array( size * size * 4 ); // 4 floats per RGBA pixel
		const matricesTexture = new DataTexture( matricesArray, size, size, RGBAFormat, FloatType );

		this.matrices = matricesArray;
		this.matricesTexture = matricesTexture;
		this.matricesTextureSize = size;

	}

	applyGeometry( geometry ) {

		// @TODO: geometry.groups support
		// @TODO: geometry.drawRange support
		// @TODO: geometry.mortphAttributes support

		if ( this._currentGeometryCount >= this._maxGeometryCount ) {

			// @TODO: Error handling

		}

		if ( this._currentGeometryCount === 0 ) {

			for ( const attributeName in geometry.attributes ) {

				const srcAttribute = geometry.getAttribute( attributeName );
				const { array, itemSize, normalized } = srcAttribute;

				const dstArray = new array.constructor( this._maxVertexCount * itemSize );
				const dstAttribute = new srcAttribute.constructor( dstArray, itemSize, normalized );
				dstAttribute.setUsage( srcAttribute.usage );

				this.geometry.setAttribute( attributeName, dstAttribute );

			}

			if ( geometry.getIndex() !== null ) {

				const indexArray = this._maxIndexCount > 65534
					? new Uint32Array( this._maxIndexCount )
					: new Uint16Array( this._maxIndexCount );

				this.geometry.setIndex( new BufferAttribute( indexArray, 1 ) );

			}

		} else {

			// @TODO: Check if geometry has the same attributes set

		}

		const hasIndex = this.geometry.getIndex() !== null;
		const dstIndex = this.geometry.getIndex();
		const srcIndex = geometry.getIndex();

		// Assuming geometry has position attribute
		const srcPositionAttribute = geometry.getAttribute( 'position' );

		this._drawStarts.push( hasIndex ? this._currentIndexCount : this._currentVertexCount );
		this._drawCounts.push( hasIndex ? srcIndex.count : srcPositionAttribute.count );
		this._visibilities.push( true );
		this._inViewports.push( true );

		// @TODO: Error handling if exceeding maxVertexCount or maxIndexCount? Or just ignore?
		// @TODO: For platforms which don't support WEBGL_multi_draw extension
		//        we may need to add draw id attribute because they can't use gl_DrawID in the shader

		for ( const attributeName in geometry.attributes ) {

			const srcAttribute = geometry.getAttribute( attributeName );
			const dstAttribute = this.geometry.getAttribute( attributeName );

			dstAttribute.array.set( srcAttribute.array, this._currentVertexCount * dstAttribute.itemSize );
			dstAttribute.needsUpdate = true;

		}

		if ( hasIndex ) {

			for ( let i = 0; i < srcIndex.count; i ++ ) {

				dstIndex.setX( this._currentIndexCount + i, this._currentVertexCount + srcIndex.getX( i ) );

			}

			this._currentIndexCount += srcIndex.count;
			dstIndex.needsUpdate = true;

		}

		this._currentVertexCount += srcPositionAttribute.count;

		const geometryId = this._currentGeometryCount;
		_identityMatrix.toArray( this.matrices, geometryId * 16 );

		if ( geometry.boundingSphere === null ) {

			geometry.computeBoundingSphere();

		}

		this._boundingSpheres.push( geometry.boundingSphere.clone() );

		this._currentGeometryCount ++;

		return geometryId;

	}

	discardGeometry( /* id  */ ) {

		// @TODO: Implement
		// @TODO: We may need defragmentation or
		//        may need to change data layout from array base to something else

	}

	getGeometryCount() {

		return this._currentGeometryCount;

	}

	getBoundingSphereAt( id, sphere ) {

		return sphere.copy( this._boundingSpheres[ id ] );

	}

	setMatrixAt( id, matrix ) {

		matrix.toArray( this.matrices, id * 16 );
		this.matricesTexture.needsUpdate = true;

		return this;

	}

	getMatrixAt( id, matrix ) {

		return matrix.fromArray( this.matrices, id * 16 );

	}

	setVisibilityAt( id, visible ) {

		this._visibilities[ id ] = visible;
		return this;

	}

	getVisibilityAt( id ) {

		return this._visibilities[ id ];

	}

	copy() {

		// @TODO: Implement

	}

	toJSON() {

		// @TODO: Implement

	}

	dispose() {

		this.matricesTexture.dispose();
		this.matricesTexture = null;

	}

	// The following methods are not expected to be called other than from WebGLRenderer

	// @TODO: Resetting the status each frame may not be elegant?
	resetCullingStatus() {

		for ( let i = 0; i < this._inViewports.length; i ++ ) {

			this._inViewports[ i ] = true;

		}

	}

	// @TODO: This name is good?
	intersectsFrustum( frustum ) {

		let intersected = false;

		for ( let i = 0; i < this._boundingSpheres.length; i ++ ) {

			if ( ! this._visibilities[ i ] ) continue;

			const boundingSphere = this._boundingSpheres[ i ];
			this.getMatrixAt( i, _matrix );
			_sphere.copy( boundingSphere ).applyMatrix4( _matrix ).applyMatrix4( this.matrixWorld );
			this._inViewports[ i ] = frustum.intersectsSphere( _sphere );
			intersected ||= this._inViewports[ i ];

		}

		// Return true if there is at least one geometry intersecting the frustum
		return intersected;

	}

	// @TODO: Rename?
	// @TODO: Is passing two arrays a good API design?
	getDrawStartsAndCounts( starts, counts ) {

		starts.length = 0;
		counts.length = 0;

		// @TODO: Optimize in case this.frustumCulled is false or
		// frustum culling results are the same as the previous frame.
		// In that case we can reuse the arrays of the previous frame.

		// Assuming geometry has position
		const bytesPerElement =	this.geometry.getIndex() !== null
			? this.geometry.getIndex().array.BYTES_PER_ELEMENT
			: this.geometry.getAttribute( 'position' ).array.BYTES_PER_ELEMENT;

		// Another option would be packing only visible ones but
		// it requires matrices texture update because id in the shader can change
		for ( let i = 0; i < this._drawStarts.length; i ++ ) {

			starts.push( this._drawStarts[ i ] * bytesPerElement );
			counts.push( this._visibilities[ i ] && this._inViewports[ i ] ? this._drawCounts[ i ] : 0 );

		}

	}

}

BatchedMesh.prototype.isBatchedMesh = true;

export { BatchedMesh };
