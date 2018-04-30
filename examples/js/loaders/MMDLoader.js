/**
 * @author takahiro / https://github.com/takahirox
 *
 * Dependencies
 *  - mmd-parser https://github.com/takahirox/mmd-parser
 *  - ammo.js https://github.com/kripken/ammo.js
 *  - THREE.TGALoader
 *  - THREE.MMDPhysics
 *  - THREE.CCDIKSolver
 *  - THREE.OutlineEffect
 *
 *
 * This loader loads and parses PMD/PMX and VMD binary files
 * then creates mesh for Three.js.
 *
 * PMD/PMX is a model data format and VMD is a motion data format
 * used in MMD(Miku Miku Dance).
 *
 * MMD is a 3D CG animation tool which is popular in Japan.
 *
 *
 * MMD official site
 *  http://www.geocities.jp/higuchuu4/index_e.htm
 *
 * PMD, VMD format
 *  http://blog.goo.ne.jp/torisu_tetosuki/e/209ad341d3ece2b1b4df24abf619d6e4
 *
 * PMX format
 *  http://gulshan-i-raz.geo.jp/labs/2012/10/17/pmx-format1/
 *
 *
 * TODO
 *  - light motion in vmd support.
 *  - SDEF support.
 *  - uv/material/bone morphing support.
 *  - more precise grant skinning support.
 *  - shadow support.
 */

THREE.MMDLoader = ( function () {

	function MMDLoader( manager ) {

		if ( typeof MMDParser === 'undefined' ) {

			throw new Error( 'THREE.MMDLoader: Import MMDParser https://www.npmjs.com/package/mmd-parser' );

		}

		if ( THREE.TGALoader === undefined ) {

			throw new Error( 'THREE.MMDLoader: Import THREE.TGALoader' );

		}

		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

		this.loader = new THREE.FileLoader( this.manager );
		this.audioLoader = new THREE.AudioLoader( this.manager );

		this.parser = new MMDParser.Parser();
		this.meshBuilder = new MeshBuilder( this.manager );
		this.animationBuilder = new AnimationBuilder();

	}

	MMDLoader.prototype = {

		constructor: MMDLoader,

		crossOrigin: undefined,

		setCrossOrigin: function ( value ) {

			this.crossOrigin = value;
			return this;

		},

		load: function ( url, onLoad, onProgress, onError ) {

			var parser = this.parser;
			var builder = this.meshBuilder.setCrossOrigin( this.crossOrigin );

			var texturePath = THREE.LoaderUtils.extractUrlBase( url );
			var modelExtension = extractExtension( url ).toLowerCase();

			// Should I detect by seeing header?
			if ( modelExtension !== 'pmd' && modelExtension !== 'pmx' ) {

				if ( onError ) onError( new Error( 'THREE.MMDLoader: Unknown model file extension .' + modelExtension + '.' ) );

				return;

			}

			this.loader
				.setMimeType( undefined )
				.setResponseType( 'arraybuffer' )
				.load( url, function ( buffer ) {

					var data = modelExtension === 'pmd'
						? parser.parsePmd( buffer, true )
						: parser.parsePmx( buffer, true );

					onLoad(	builder.build( data, texturePath, onProgress, onError )	);

				}, onProgress, onError );

		},

		loadAnimation: function ( url, onLoad, onProgress, onError ) {

			var urls = Array.isArray( url ) ? url : [ url ];

			var vmds = [];
			var vmdNum = urls.length;

			var scope = this;
			var parser = this.parser;

			this.loader
				.setMimeType( undefined )
				.setResponseType( 'arraybuffer' );

			for ( var i = 0, il = urls.length; i < il; i ++ ) {

				this.loader.load( urls[ i ], function ( buffer ) {

					vmds.push( parser.parseVmd( buffer, true ) );

					if ( vmds.length === vmdNum ) onLoad( parser.mergeVmds( vmds ) );

				}, onProgress, onError );

			}

		},

		loadWithAnimation: function ( modelUrl, vmdUrl, onLoad, onProgress, onError ) {

			var scope = this;

			this.load( modelUrl, function ( mesh ) {

				scope.loadAnimation( vmdUrl, function ( vmd ) {

					mesh.geometry.animations = scope.animationBuilder.build( vmd, mesh );

					onLoad( mesh );

				}, onProgress, onError );

			}, onProgress, onError );

		},

		loadAudio: function ( url, onLoad, onProgress, onError ) {

			this.audioLoader.load( url, function ( buffer ) {

				var listener = new THREE.AudioListener();
				var audio = new THREE.Audio( listener ).setBuffer( buffer );

				onLoad( audio, listener );

			}, onProgress, onError );

		},

		loadPose: function ( url, onLoad, onProgress, onError, params ) {

			params = params || {};

			var parser = this.parser;

			this.loader
				.setMimeType( params.charcode === 'unicode' ? undefined : 'text/plain; charset=shift_jis' )
				.setResponseType( 'text' )
				.load( url, function ( text ) {

					onLoad( parser.parseVpd( text, true ) );

				}, onProgress, onError );

		}

	};

	// Utilities

	function extractExtension( url ) {

		var index = url.lastIndexOf( '.' );

		if ( index < 0 ) {

			return '';

		}

		return url.slice( index + 1 );

	}

	/*
	 * base64 encoded defalut toon textures toon00.bmp - toon10.bmp.
	 * We don't need to request external toon image files.
	 * This idea is from http://www20.atpages.jp/katwat/three.js_r58/examples/mytest37/mmd.three.js
	 */
	var DEFAULT_TOON_TEXTURES = [
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAL0lEQVRYR+3QQREAAAzCsOFfNJPBJ1XQS9r2hsUAAQIECBAgQIAAAQIECBAgsBZ4MUx/ofm2I/kAAAAASUVORK5CYII=',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAN0lEQVRYR+3WQREAMBACsZ5/bWiiMvgEBTt5cW37hjsBBAgQIECAwFwgyfYPCCBAgAABAgTWAh8aBHZBl14e8wAAAABJRU5ErkJggg==',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAOUlEQVRYR+3WMREAMAwDsYY/yoDI7MLwIiP40+RJklfcCCBAgAABAgTqArfb/QMCCBAgQIAAgbbAB3z/e0F3js2cAAAAAElFTkSuQmCC',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAN0lEQVRYR+3WQREAMBACsZ5/B5ilMvgEBTt5cW37hjsBBAgQIECAwFwgyfYPCCBAgAABAgTWAh81dWyx0gFwKAAAAABJRU5ErkJggg==',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAOklEQVRYR+3WoREAMAwDsWb/UQtCy9wxTOQJ/oQ8SXKKGwEECBAgQIBAXeDt7f4BAQQIECBAgEBb4AOz8Hzx7WLY4wAAAABJRU5ErkJggg==',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABPUlEQVRYR+1XwW7CMAy1+f9fZOMysSEOEweEOPRNdm3HbdOyIhAcklPrOs/PLy9RygBALxzcCDQFmgJNgaZAU6Ap0BR4PwX8gsRMVLssMRH5HcpzJEaWL7EVg9F1IHRlyqQohgVr4FGUlUcMJSjcUlDw0zvjeun70cLWmneoyf7NgBTQSniBTQQSuJAZsOnnaczjIMb5hCiuHKxokCrJfVnrctyZL0PkJAJe1HMil4nxeyi3Ypfn1kX51jpPvo/JeCNC4PhVdHdJw2XjBR8brF8PEIhNVn12AgP7uHsTBguBn53MUZCqv7Lp07Pn5k1Ro+uWmUNn7D+M57rtk7aG0Vo73xyF/fbFf0bPJjDXngnGocDTdFhygZjwUQrMNrDcmZlQT50VJ/g/UwNyHpu778+yW+/ksOz/BFo54P4AsUXMfRq7XWsAAAAASUVORK5CYII=',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACMElEQVRYR+2Xv4pTQRTGf2dubhLdICiii2KnYKHVolhauKWPoGAnNr6BD6CvIVaihYuI2i1ia0BY0MZGRHQXjZj/mSPnnskfNWiWZUlzJ5k7M2cm833nO5Mziej2DWWJRUoCpQKlAntSQCqgw39/iUWAGmh37jrRnVsKlgpiqmkoGVABA7E57fvY+pJDdgKqF6HzFCSADkDq+F6AHABtQ+UMVE5D7zXod7fFNhTEckTbj5XQgHzNN+5tQvc5NG7C6BNkp6D3EmpXHDR+dQAjFLchW3VS9rlw3JBh+B7ys5Cf9z0GW1C/7P32AyBAOAz1q4jGliIH3YPuBnSfQX4OGreTIgEYQb/pBDtPnEQ4CivXYPAWBk13oHrB54yA9QuSn2H4AcKRpEILDt0BUzj+RLR1V5EqjD66NPRBVpLcQwjHoHYJOhsQv6U4mnzmrIXJCFr4LDwm/xBUoboG9XX4cc9VKdYoSA2yk5NQLJaKDUjTBoveG3Z2TElTxwjNK4M3LEZgUdDdruvcXzKBpStgp2NPiWi3ks9ZXxIoFVi+AvHLdc9TqtjL3/aYjpPlrzOcEnK62Szhimdd7xX232zFDTgtxezOu3WNMRLjiKgjtOhHVMd1loynVHvOgjuIIJMaELEqhJAV/RCSLbWTcfPFakFgFlALTRRvx+ok6Hlp/Q+v3fmx90bMyUzaEAhmM3KvHlXTL5DxnbGf/1M8RNNACLL5MNtPxP/mypJAqcDSFfgFhpYqWUzhTEAAAAAASUVORK5CYII=',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAL0lEQVRYR+3QQREAAAzCsOFfNJPBJ1XQS9r2hsUAAQIECBAgQIAAAQIECBAgsBZ4MUx/ofm2I/kAAAAASUVORK5CYII=',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAL0lEQVRYR+3QQREAAAzCsOFfNJPBJ1XQS9r2hsUAAQIECBAgQIAAAQIECBAgsBZ4MUx/ofm2I/kAAAAASUVORK5CYII=',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAL0lEQVRYR+3QQREAAAzCsOFfNJPBJ1XQS9r2hsUAAQIECBAgQIAAAQIECBAgsBZ4MUx/ofm2I/kAAAAASUVORK5CYII=',
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAL0lEQVRYR+3QQREAAAzCsOFfNJPBJ1XQS9r2hsUAAQIECBAgQIAAAQIECBAgsBZ4MUx/ofm2I/kAAAAASUVORK5CYII='
	];

	//

	function MeshBuilder( manager ) {

		this.geometryBuilder = new GeometryBuilder();
		this.materialBuilder = new MaterialBuilder( manager );

	}

	MeshBuilder.prototype = {

		constructor: MeshBuilder,

		crossOrigin: undefined,

		setCrossOrigin: function ( crossOrigin ) {

			this.crossOrigin = crossOrigin;
			return this;

		},

		build: function ( data, texturePath, onProgress, onError ) {

			var geometry = this.geometryBuilder.build( data );
			var material = this.materialBuilder
					.setCrossOrigin( this.crossOrigin )
					.setTexturePath( texturePath )
					.build( data, geometry, onProgress, onError );

			var mesh = new THREE.SkinnedMesh( geometry, material );

			// console.log( mesh ); // for console debug

			return mesh;

		}

	};

	//

	function GeometryBuilder() {

	}

	GeometryBuilder.prototype = {

		constructor: GeometryBuilder,

		build: function ( data, onProgress, onError ) {

			// for geometry
			var positions = [];
			var uvs = [];
			var normals = [];

			var indices = [];

			var groups = [];

			var bones = [];
			var skinIndices = [];
			var skinWeights = [];

			var morphTargets = [];
			var morphPositions = [];

			var iks = [];
			var grants = [];

			var rigidBodies = [];
			var constraints = [];

			// for work
			var offset = 0;
			var boneTypeTable = {};

			// positions, normals, uvs, skinIndices, skinWeights

			for ( var i = 0; i < data.metadata.vertexCount; i ++ ) {

				var v = data.vertices[ i ];

				for ( var j = 0, jl = v.position.length; j < jl; j ++ ) {

					positions.push( v.position[ j ] );

				}

				for ( var j = 0, jl = v.normal.length; j < jl; j ++ ) {

					normals.push( v.normal[ j ] );

				}

				for ( var j = 0, jl = v.uv.length; j < jl; j ++ ) {

					uvs.push( v.uv[ j ] );

				}

				for ( var j = 0; j < 4; j ++ ) {

					skinIndices.push( v.skinIndices.length - 1 >= j ? v.skinIndices[ j ] : 0.0 );

				}

				for ( var j = 0; j < 4; j ++ ) {

					skinWeights.push( v.skinWeights.length - 1 >= j ? v.skinWeights[ j ] : 0.0 );

				}

			}

			// indices

			for ( var i = 0; i < data.metadata.faceCount; i ++ ) {

				var f = data.faces[ i ];

				for ( var j = 0, jl = f.indices.length; j < jl; j ++ ) {

					indices.push( f.indices[ j ] );

				}

			}

			// groups

			for ( var i = 0; i < data.metadata.materialCount; i ++ ) {

				var material = data.materials[ i ];

				groups.push( {
					offset: offset * 3,
					count: material.faceCount * 3
				} );

				offset += material.faceCount;

			}

			// bones

			for ( var i = 0; i < data.metadata.rigidBodyCount; i ++ ) {

				var body = data.rigidBodies[ i ];
				var value = boneTypeTable[ body.boneIndex ];

				// keeps greater number if already value is set without any special reasons
				value = value === undefined ? body.type : Math.max( body.type, value );

				boneTypeTable[ body.boneIndex ] = value;

			}

			for ( var i = 0; i < data.metadata.boneCount; i ++ ) {

				var b = data.bones[ i ];

				var bone = {
					parent: b.parentIndex,
					name: b.name,
					pos: [ b.position[ 0 ], b.position[ 1 ], b.position[ 2 ] ],
					rotq: [ 0, 0, 0, 1 ],
					scl: [ 1, 1, 1 ],
					rigidBodyType: boneTypeTable[ i ] !== undefined ? boneTypeTable[ i ] : - 1
				};

				if ( bone.parent !== - 1 ) {

					bone.pos[ 0 ] -= data.bones[ bone.parent ].position[ 0 ];
					bone.pos[ 1 ] -= data.bones[ bone.parent ].position[ 1 ];
					bone.pos[ 2 ] -= data.bones[ bone.parent ].position[ 2 ];

				}

				bones.push( bone );

			}

			// iks

			// TODO: remove duplicated codes between PMD and PMX
			if ( data.metadata.format === 'pmd' ) {

				for ( var i = 0; i < data.metadata.ikCount; i ++ ) {

					var ik = data.iks[ i ];

					var param = {
						target: ik.target,
						effector: ik.effector,
						iteration: ik.iteration,
						maxAngle: ik.maxAngle * 4,
						links: []
					};

					for ( var j = 0, jl = ik.links.length; j < jl; j ++ ) {

						var link = {};
						link.index = ik.links[ j ].index;
						link.enabled = true;

						if ( data.bones[ link.index ].name.indexOf( 'ひざ' ) >= 0 ) {

							link.limitation = new THREE.Vector3( 1.0, 0.0, 0.0 );

						}

						param.links.push( link );

					}

					iks.push( param );

				}

			} else {

				for ( var i = 0; i < data.metadata.boneCount; i ++ ) {

					var b = data.bones[ i ];
					var ik = b.ik;

					if ( ik === undefined ) continue;

					var param = {
						target: i,
						effector: ik.effector,
						iteration: ik.iteration,
						maxAngle: ik.maxAngle,
						links: []
					};

					for ( var j = 0, jl = ik.links.length; j < jl; j ++ ) {

						var link = {};
						link.index = ik.links[ j ].index;
						link.enabled = true;

						if ( ik.links[ j ].angleLimitation === 1 ) {

							link.limitation = new THREE.Vector3( 1.0, 0.0, 0.0 );
							// TODO: use limitation angles
							// link.lowerLimitationAngle;
							// link.upperLimitationAngle;

						}

						param.links.push( link );

					}

					iks.push( param );

				}

			}

			// grants

			if ( data.metadata.format === 'pmx' ) {

				for ( var i = 0; i < data.metadata.boneCount; i ++ ) {

					var b = data.bones[ i ];
					var grant = b.grant;

					if ( grant === undefined ) continue;

					var param = {
						index: i,
						parentIndex: grant.parentIndex,
						ratio: grant.ratio,
						isLocal: grant.isLocal,
						affectRotation: grant.affectRotation,
						affectPosition: grant.affectPosition,
						transformationClass: b.transformationClass
					};

					grants.push( param );

				}

				grants.sort( function ( a, b ) {

					return a.transformationClass - b.transformationClass;

				} );

			}

			// morph

			function updateAttributes( attribute, m, ratio ) {

				for ( var i = 0; i < m.elementCount; i ++ ) {

					var v = m.elements[ i ];

					var index;

					if ( data.metadata.format === 'pmd' ) {

						index = data.morphs[ 0 ].elements[ v.index ].index;

					} else {

						index = v.index;

					}

					attribute.array[ index * 3 + 0 ] += v.position[ 0 ] * ratio;
					attribute.array[ index * 3 + 1 ] += v.position[ 1 ] * ratio;
					attribute.array[ index * 3 + 2 ] += v.position[ 2 ] * ratio;

				}

			}

			for ( var i = 0; i < data.metadata.morphCount; i ++ ) {

				var m = data.morphs[ i ];
				var params = { name: m.name };

				var attribute = new THREE.Float32BufferAttribute( data.metadata.vertexCount * 3, 3 );
				attribute.name = m.name;

				for ( var j = 0; j < data.metadata.vertexCount * 3; j ++ ) {

					attribute.array[ j ] = positions[ j ];

				}

				if ( data.metadata.format === 'pmd' ) {

					if ( i !== 0 ) {

						updateAttributes( attribute, m, 1.0 );

					}

				} else {

					if ( m.type === 0 ) { // group

						for ( var j = 0; j < m.elementCount; j ++ ) {

							var m2 = data.morphs[ m.elements[ j ].index ];
							var ratio = m.elements[ j ].ratio;

							if ( m2.type === 1 ) {

								updateAttributes( attribute, m2, ratio );

							} else {

								// TODO: implement

							}

						}

					} else if ( m.type === 1 ) { // vertex

						updateAttributes( attribute, m, 1.0 );

					} else if ( m.type === 2 ) { // bone

						// TODO: implement

					} else if ( m.type === 3 ) { // uv

						// TODO: implement

					} else if ( m.type === 4 ) { // additional uv1

						// TODO: implement

					} else if ( m.type === 5 ) { // additional uv2

						// TODO: implement

					} else if ( m.type === 6 ) { // additional uv3

						// TODO: implement

					} else if ( m.type === 7 ) { // additional uv4

						// TODO: implement

					} else if ( m.type === 8 ) { // material

						// TODO: implement

					}

				}

				morphTargets.push( params );
				morphPositions.push( attribute );

			}

			// rigid bodies from rigidBodies field.

			for ( var i = 0; i < data.metadata.rigidBodyCount; i ++ ) {

				var rigidBody = data.rigidBodies[ i ];
				var params = {};

				for ( var key in rigidBody ) {

					params[ key ] = rigidBody[ key ];

				}

				/*
				 * RigidBody position parameter in PMX seems global position
				 * while the one in PMD seems offset from corresponding bone.
				 * So unify being offset.
				 */
				if ( data.metadata.format === 'pmx' ) {

					if ( params.boneIndex !== - 1 ) {

						var bone = data.bones[ params.boneIndex ];
						params.position[ 0 ] -= bone.position[ 0 ];
						params.position[ 1 ] -= bone.position[ 1 ];
						params.position[ 2 ] -= bone.position[ 2 ];

					}

				}

				rigidBodies.push( params );

			}

			// constraints from constraints field.

			for ( var i = 0; i < data.metadata.constraintCount; i ++ ) {

				var constraint = data.constraints[ i ];
				var params = {};

				for ( var key in constraint ) {

					params[ key ] = constraint[ key ];

				}

				var bodyA = rigidBodies[ params.rigidBodyIndex1 ];
				var bodyB = rigidBodies[ params.rigidBodyIndex2 ];

				/*
				 * Refer to http://www20.atpages.jp/katwat/wp/?p=4135
				 */
				if ( bodyA.type !== 0 && bodyB.type === 2 ) {

					if ( bodyA.boneIndex !== - 1 && bodyB.boneIndex !== - 1 &&
					     data.bones[ bodyB.boneIndex ].parentIndex === bodyA.boneIndex ) {

						bodyB.type = 1;

					}

				}

				constraints.push( params );

			}

			// build BufferGeometry.

			var geometry = new THREE.BufferGeometry();

			geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
			geometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
			geometry.addAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
			geometry.addAttribute( 'skinIndex', new THREE.Uint16BufferAttribute( skinIndices, 4 ) );
			geometry.addAttribute( 'skinWeight', new THREE.Float32BufferAttribute( skinWeights, 4 ) );
			geometry.setIndex( indices );

			for ( var i = 0, il = groups.length; i < il; i ++ ) {

				geometry.addGroup( groups[ i ].offset, groups[ i ].count, i );

			}

			geometry.bones = bones;

			geometry.morphTargets = morphTargets;
			geometry.morphAttributes.position = morphPositions;

			geometry.iks = iks;
			geometry.grants = grants;

			geometry.rigidBodies = rigidBodies;
			geometry.constraints = constraints;

			geometry.mmdFormat = data.metadata.format;

			geometry.computeBoundingSphere();

			return geometry;

		}

	};

	//

	function MaterialBuilder( manager ) {

		this.textureLoader = new THREE.TextureLoader( this.manager );
		this.tgaLoader = new THREE.TGALoader( this.manager );

	}

	MaterialBuilder.prototype = {

		constructor: MaterialBuilder,

		crossOrigin: undefined,

		texturePath: undefined,

		setCrossOrigin: function ( crossOrigin ) {

			this.crossOrigin = crossOrigin;
			return this;

		},

		setTexturePath: function ( texturePath ) {

			this.texturePath = texturePath;
			return this;

		},

		build: function ( data, geometry, onProgress, onError ) {

			var materials = [];

			var textures = {};

			this.textureLoader.setCrossOrigin( this.crossOrigin );

			// materials

			for ( var i = 0; i < data.metadata.materialCount; i ++ ) {

				var material = data.materials[ i ];

				var params = { userData: {} };

				if ( material.name !== undefined ) params.name = material.name;

				/*
				 * Color
				 *
				 * MMD         MeshToonMaterial
				 * diffuse  -  color
				 * specular -  specular
				 * ambient  -  emissive * a
				 *               (a = 1.0 without map texture or 0.2 with map texture)
				 *
				 * MeshToonMaterial doesn't have ambient. Set it to emissive instead.
				 * It'll be too bright if material has map texture so using coef 0.2.
				 */
				params.color = new THREE.Color().fromArray( material.diffuse );
				params.opacity = material.diffuse[ 3 ];
				params.specular = new THREE.Color().fromArray( material.specular );
				params.emissive = new THREE.Color().fromArray( material.ambient );
				params.shininess = Math.max( material.shininess, 1e-4 ); // to prevent pow( 0.0, 0.0 )
				params.transparent = params.opacity !== 1.0;

				// 

				params.skinning = geometry.bones.length > 0 ? true : false;
				params.morphTargets = geometry.morphTargets.length > 0 ? true : false;
				params.lights = true;
				params.fog = true;

				// blend

				params.blending = THREE.CustomBlending;
				params.blendSrc = THREE.SrcAlphaFactor;
				params.blendDst = THREE.OneMinusSrcAlphaFactor;
				params.blendSrcAlpha = THREE.SrcAlphaFactor;
				params.blendDstAlpha = THREE.DstAlphaFactor;

				// side

				if ( data.metadata.format === 'pmx' && ( material.flag & 0x1 ) === 1 ) {

					params.side = THREE.DoubleSide;

				} else {

					params.side = params.opacity === 1.0 ? THREE.FrontSide : THREE.DoubleSide;

				}

				if ( data.metadata.format === 'pmd' ) {

					// map, envMap

					if ( material.fileName ) {

						var fileName = material.fileName;
						var fileNames = fileName.split( '*' );

						// fileNames[ 0 ]: mapFileName
						// fileNames[ 1 ]: envMapFileName( optional )

						params.map = this._loadTexture( fileNames[ 0 ], textures );

						if ( fileNames.length > 1 ) {

							var extension = fileNames[ 1 ].slice( - 4 ).toLowerCase();

							params.envMap = this._loadTexture(
								fileNames[ 1 ],
								textures,
								{ sphericalReflectionMapping: true }
							);

							params.combine = extension === '.sph'
								? THREE.MultiplyOperation
								: THREE.AddOperation;

						}

					}

					// gradientMap

					var toonFileName = ( material.toonIndex === - 1 )
						? 'toon00.bmp'
						: data.toonTextures[ material.toonIndex ].fileName;

					params.gradientMap = this._loadTexture(
						toonFileName,
						textures,
						{
							isToonTexture: true,
							isDefaultToonTexture: this._isDefaultToonTexture( toonFileName )
						}
					);

					// parameters for OutlineEffect

					params.userData.outlineParameters = {
						thickness: material.edgeFlag === 1 ? 0.003 : 0.0,
						color: new THREE.Color( 0.0, 0.0, 0.0 ),
						alpha: 1.0,
						visible: material.edgeFlag === 1
					};

				} else {

					// map

					if ( material.textureIndex !== - 1 ) {

						params.map = this._loadTexture( data.textures[ material.textureIndex ], textures );

					}

					// envMap TODO: support m.envFlag === 3

					if ( material.envTextureIndex !== - 1 && ( material.envFlag === 1 || material.envFlag == 2 ) ) {

						params.envMap = this._loadTexture(
							data.textures[ material.envTextureIndex ],
							textures, { sphericalReflectionMapping: true }
						);

						params.combine = material.envFlag === 1
							? THREE.MultiplyOperation
							: THREE.AddOperation;

					}

					// gradientMap

					var toonFileName, isDefaultToon;

					if ( material.toonIndex === - 1 || material.toonFlag !== 0 ) {

						toonFileName = 'toon' + ( '0' + ( material.toonIndex + 1 ) ).slice( - 2 ) + '.bmp';
						isDefaultToon = true;

					} else {

						toonFileName = data.textures[ material.toonIndex ];
						isDefaultToon = false;

					}

					params.gradientMap = this._loadTexture(
						toonFileName,
						textures,
						{
							isToonTexture: true,
							isDefaultToonTexture: isDefaultToon
						}
					);

					// parameters for OutlineEffect
					params.userData.outlineParameters = {
						thickness: material.edgeSize / 300,
						color: new THREE.Color().fromArray( material.edgeColor ),
						alpha: material.edgeColor[ 3 ],
						visible: ( material.flag & 0x10 ) !== 0 && material.edgeSize > 0.0
					};

				}

				if ( params.map !== undefined ) {

					if ( ! params.transparent ) {

						this._checkImageTransparency( params.map, geometry, i );

					}

					params.emissive.multiplyScalar( 0.2 );

				}

				materials.push( new THREE.MeshToonMaterial( params ) );

			}

			if ( data.metadata.format === 'pmx' ) {

				// set transparent true if alpha morph is defined.

				function checkAlphaMorph( elements, materials ) {

					for ( var i = 0, il = elements.length; i < il; i ++ ) {

						var element = elements[ i ];

						if ( element.index === - 1 ) continue;

						var material = materials[ element.index ];

						if ( material.opacity !== element.diffuse[ 3 ] ) {

							material.transparent = true;

						}

					}

				}

				for ( var i = 0, il = data.morphs.length; i < il; i ++ ) {

					var morph = data.morphs[ i ];
					var elements = morph.elements;

					if ( morph.type === 0 ) {

						for ( var j = 0, jl = elements.length; j < jl; j ++ ) {

							var morph2 = model.morphs[ elements[ j ].index ];

							if ( morph2.type !== 8 ) continue;

							checkAlphaMorph( morph2.elements, materials );

						}

					} else if ( morph.type === 8 ) {

						checkAlphaMorph( elements, materials );

					}

				}

			}

			return materials;

		},

		_isDefaultToonTexture: function ( name ) {

			if ( name.length !== 10 ) return false;

			return /toon(10|0[0-9])\.bmp/.test( name );

		},

		_loadTexture: function ( filePath, textures, params, onProgress, onError ) {

			params = params || {};

			var scope = this;

			var fullPath;

			if ( params.isDefaultToonTexture === true ) {

				var index;

				try {

					var index = parseInt( filePath.match( 'toon([0-9]{2})\.bmp$' )[ 1 ] );

				} catch ( e ) {

					console.warn( 'THREE.MMDLoader: ' + filePath + ' seems like a '
						+ 'not right default texture path. Using toon00.bmp instead.' );

					index = 0;

				}

				fullPath = DEFAULT_TOON_TEXTURES[ index ];

			} else {

				fullPath = this.texturePath + filePath;

			}

			if ( textures[ fullPath ] !== undefined ) return textures[ fullPath ];

			var loader = THREE.Loader.Handlers.get( fullPath );

			if ( loader === null ) {

				loader = ( filePath.slice( - 4 ).toLowerCase() === '.tga' )
					? this.tgaLoader
					: this.textureLoader;

			}

			var texture = loader.load( fullPath, function ( t ) {

				// MMD toon texture is Axis-Y oriented
				// but Three.js gradient map is Axis-X oriented.
				// So here replaces the toon texture image with the rotated one.
				if ( params.isToonTexture === true ) {

					t.image = scope._getRotatedImage( t.image );

				}

				t.flipY = false;
				t.wrapS = THREE.RepeatWrapping;
				t.wrapT = THREE.RepeatWrapping;

				for ( var i = 0; i < texture.readyCallbacks.length; i ++ ) {

					texture.readyCallbacks[ i ]( texture );

				}

				delete texture.readyCallbacks;

			}, onProgress, onError );

			if ( params.sphericalReflectionMapping === true ) {

				texture.mapping = THREE.SphericalReflectionMapping;

			}

			texture.readyCallbacks = [];

			textures[ fullPath ] = texture;

			return texture;

		},

		_getRotatedImage: function ( image ) {

			var canvas = document.createElement( 'canvas' );
			var context = canvas.getContext( '2d' );

			var width = image.width;
			var height = image.height;

			canvas.width = width;
			canvas.height = height;

			context.clearRect( 0, 0, width, height );
			context.translate( width / 2.0, height / 2.0 );
			context.rotate( 0.5 * Math.PI ); // 90.0 * Math.PI / 180.0
			context.translate( - width / 2.0, - height / 2.0 );
			context.drawImage( image, 0, 0 );

			return context.getImageData( 0, 0, width, height );

		},

		// Check if the partial image area used by texture requires transparency
		_checkImageTransparency: function ( map, geometry, groupIndex ) {

			map.readyCallbacks.push( function ( t ) {

				// Is there any efficient ways?
				function createImageData( image ) {

					var canvas = document.createElement( 'canvas' );
					canvas.width = image.width;
					canvas.height = image.height;

					var context = canvas.getContext( '2d' );
					context.drawImage( image, 0, 0 );

					return context.getImageData( 0, 0, canvas.width, canvas.height );

				}

				function detectImageTransparency( image, uvs, indices ) {

					var width = image.width;
					var height = image.height;
					var data = image.data;
					var threshold = 253;

					if ( data.length / ( width * height ) !== 4 ) return false;

					for ( var i = 0; i < indices.length; i += 3 ) {

						var centerUV = { x: 0.0, y: 0.0 };

						for ( var j = 0; j < 3; j ++ ) {

							var index = indices[ i * 3 + j ];
							var uv = { x: uvs[ index * 2 + 0 ], y: uvs[ index * 2 + 1 ] };

							if ( getAlphaByUv( image, uv ) < threshold ) return true;

							centerUV.x += uv.x;
							centerUV.y += uv.y;

						}

						centerUV.x /= 3;
						centerUV.y /= 3;

						if ( getAlphaByUv( image, centerUV ) < threshold ) return true;

					}

					return false;

				}

				/*
				 * This method expects
				 *   t.flipY = false
				 *   t.wrapS = THREE.RepeatWrapping
				 *   t.wrapT = THREE.RepeatWrapping
				 * TODO: more precise
				 */
				function getAlphaByUv( image, uv ) {

					var width = image.width;
					var height = image.height;

					var x = Math.round( uv.x * width ) % width;
					var y = Math.round( uv.y * height ) % height;

					if ( x < 0 ) x += width;
					if ( y < 0 ) y += height;

					var index = y * width + x;

					return image.data[ index * 4 + 3 ];

				}

				var imageData = t.image.data !== undefined ? t.image : createImageData( t.image );
				var group = geometry.groups[ groupIndex ];

				if ( detectImageTransparency(
					imageData,
					geometry.attributes.uv.array,
					geometry.index.array.slice( group.start, group.start + group.count ) ) ) {

					map.transparent = true;

				}

			} );

		}

	};

	//

	function AnimationBuilder() {

	}

	AnimationBuilder.prototype = {

		constructor: AnimationBuilder,

		build: function ( vmd, mesh, name ) {

			var animations = [];
			animations.push( this.buildSkeletalAnimation( vmd, mesh, name ) );
			animations.push( this.buildMorphAnimation( vmd, mesh, name ) );
			return animations;

		},

		buildSkeletalAnimation: function ( vmd, mesh, name ) {

			function pushInterpolation( array, interpolation, index ) {

				array.push( interpolation[ index + 0 ] / 127 ); // x1
				array.push( interpolation[ index + 8 ] / 127 ); // x2
				array.push( interpolation[ index + 4 ] / 127 ); // y1
				array.push( interpolation[ index + 12 ] / 127 ); // y2

			};

			function createTrack( node, typedKeyFrameTrack, times, values, interpolations ) {

				var track = new typedKeyFrameTrack( node, times, values );

				track.createInterpolant = function InterpolantFactoryMethodCubicBezier( result ) {

					return new CubicBezierInterpolation( this.times, this.values, this.getValueSize(), result, new Float32Array( interpolations ) );

				};

				return track;

			};

			var tracks = [];

			var motions = {};
			var bones = mesh.skeleton.bones;
			var boneNameDictionary = {};

			for ( var i = 0, il = bones.length; i < il; i ++ ) {

				boneNameDictionary[ bones[ i ].name ] = true;

			}

			for ( var i = 0; i < vmd.metadata.motionCount; i ++ ) {

				var motion = vmd.motions[ i ];
				var boneName = motion.boneName;

				if ( boneNameDictionary[ boneName ] === undefined ) continue;

				motions[ boneName ] = motions[ boneName ] || [];
				motions[ boneName ].push( motion );

			}

			for ( var key in motions ) {

				var array = motions[ key ];

				array.sort( function ( a, b ) {

					return a.frameNum - b.frameNum;

				} );

				var times = [];
				var positions = [];
				var rotations = [];
				var pInterpolations = [];
				var rInterpolations = [];

				var basePosition = mesh.skeleton.getBoneByName( key ).position.toArray();

				for ( var i = 0, il = array.length; i < il; i ++ ) {

					var time = array[ i ].frameNum / 30;
					var position = array[ i ].position;
					var rotation = array[ i ].rotation;
					var interpolation = array[ i ].interpolation;

					times.push( time );

					for ( var j = 0; j < 3; j ++ ) positions.push( basePosition[ j ] + position[ j ] );
					for ( var j = 0; j < 4; j ++ ) rotations.push( rotation[ j ] );
					for ( var j = 0; j < 3; j ++ ) pushInterpolation( pInterpolations, interpolation, j );

					pushInterpolation( rInterpolations, interpolation, 3 );

				}

				var targetName = '.bones[' + key + ']';

				tracks.push( this._createTrack( targetName + '.position', THREE.VectorKeyframeTrack, times, positions, pInterpolations ) );
				tracks.push( this._createTrack( targetName + '.quaternion', THREE.QuaternionKeyframeTrack, times, rotations, rInterpolations ) );

			}

			return new THREE.AnimationClip( name === undefined ? '' : name, - 1, tracks );

		},

		buildMorphAnimation: function ( vmd, mesh, name ) {

			var tracks = [];

			var morphs = {};
			var morphTargetDictionary = mesh.morphTargetDictionary;

			for ( var i = 0; i < vmd.metadata.morphCount; i ++ ) {

				var morph = vmd.morphs[ i ];
				var morphName = morph.morphName;

				if ( morphTargetDictionary[ morphName ] === undefined ) continue;

				morphs[ morphName ] = morphs[ morphName ] || [];
				morphs[ morphName ].push( morph );

			}

			for ( var key in morphs ) {

				var array = morphs[ key ];

				array.sort( function ( a, b ) {

					return a.frameNum - b.frameNum;

				} );

				var times = [];
				var values = [];

				for ( var i = 0, il = array.length; i < il; i ++ ) {

					times.push( array[ i ].frameNum / 30 );
					values.push( array[ i ].weight );

				}

				tracks.push( new THREE.NumberKeyframeTrack( '.morphTargetInfluences[' + morphTargetDictionary[ key ] + ']', times, values ) );

			}

			return new THREE.AnimationClip( ( name === undefined ? '' : name ) + 'Morph', - 1, tracks );

		},

		buildCameraAnimation: function ( vmd, camera ) {

			function pushVector3( array, vec ) {

				array.push( vec.x );
				array.push( vec.y );
				array.push( vec.z );

			}

			function pushQuaternion( array, q ) {

				array.push( q.x );
				array.push( q.y );
				array.push( q.z );
				array.push( q.w );

			}

			function pushInterpolation( array, interpolation, index ) {

				array.push( interpolation[ index * 4 + 0 ] / 127 ); // x1
				array.push( interpolation[ index * 4 + 1 ] / 127 ); // x2
				array.push( interpolation[ index * 4 + 2 ] / 127 ); // y1
				array.push( interpolation[ index * 4 + 3 ] / 127 ); // y2

			};

			var tracks = [];

			var cameras = vmd.cameras === undefined ? [] : vmd.cameras.slice();

			cameras.sort( function ( a, b ) {

				return a.frameNum - b.frameNum;

			} );

			var times = [];
			var centers = [];
			var quaternions = [];
			var positions = [];
			var fovs = [];

			var cInterpolations = [];
			var qInterpolations = [];
			var pInterpolations = [];
			var fInterpolations = [];

			var quaternion = new THREE.Quaternion();
			var euler = new THREE.Euler();
			var position = new THREE.Vector3();
			var center = new THREE.Vector3();

			for ( var i = 0, il = cameras.length; i < il; i ++ ) {

				var motion = cameras[ i ];

				var time = motion.frameNum / 30;
				var pos = motion.position;
				var rot = motion.rotation;
				var distance = motion.distance;
				var fov = motion.fov;
				var interpolation = motion.interpolation;

				times.push( time );

				position.set( 0, 0, - distance );
				center.set( pos[ 0 ], pos[ 1 ], pos[ 2 ] );

				euler.set( - rot[ 0 ], - rot[ 1 ], - rot[ 2 ] );
				quaternion.setFromEuler( euler );

				position.add( center );
				position.applyQuaternion( quaternion );

				pushVector3( centers, center );
				pushQuaternion( quaternions, quaternion );
				pushVector3( positions, position );

				fovs.push( fov );

				for ( var j = 0; j < 3; j ++ ) {

					pushInterpolation( cInterpolations, interpolation, j );

				}

				pushInterpolation( qInterpolations, interpolation, 3 );

				// use the same parameter for x, y, z axis.
				for ( var j = 0; j < 3; j ++ ) {

					pushInterpolation( pInterpolations, interpolation, 4 );

				}

				pushInterpolation( fInterpolations, interpolation, 5 );

			}

			var tracks = [];

			tracks.push( this._createTrack( '.center', THREE.VectorKeyframeTrack, times, centers, cInterpolations ) );
			tracks.push( this._createTrack( '.quaternion', THREE.QuaternionKeyframeTrack, times, quaternions, qInterpolations ) );
			tracks.push( this._createTrack( '.position', THREE.VectorKeyframeTrack, times, positions, pInterpolations ) );
			tracks.push( this._createTrack( '.fov', THREE.NumberKeyframeTrack, times, fovs, fInterpolations ) );

			return new THREE.AnimationClip( name === undefined ? '' : name, - 1, tracks );

		},

		_createTrack: function ( node, typedKeyframeTrack, times, values, interpolations ) {

			/*
			 * optimizes here not to let KeyframeTrackPrototype optimize
			 * because KeyframeTrackPrototype optimizes times and values but
			 * doesn't optimize interpolations.
			 */
			if ( times.length > 2 ) {

				times = times.slice();
				values = values.slice();
				interpolations = interpolations.slice();

				var stride = values.length / times.length;
				var interpolateStride = ( stride === 3 ) ? 12 : 4; // 3: Vector3, others: Quaternion or Number

				var index = 1;

				for ( var aheadIndex = 2, endIndex = times.length; aheadIndex < endIndex; aheadIndex ++ ) {

					for ( var i = 0; i < stride; i ++ ) {

						if ( values[ index * stride + i ] !== values[ ( index - 1 ) * stride + i ] ||
							values[ index * stride + i ] !== values[ aheadIndex * stride + i ] ) {

							index ++;
							break;

						}

					}

					if ( aheadIndex > index ) {

						times[ index ] = times[ aheadIndex ];

						for ( var i = 0; i < stride; i ++ ) {

							values[ index * stride + i ] = values[ aheadIndex * stride + i ];

						}

						for ( var i = 0; i < interpolateStride; i ++ ) {

							interpolations[ index * interpolateStride + i ] = interpolations[ aheadIndex * interpolateStride + i ];

						}

					}

				}

				times.length = index + 1;
				values.length = ( index + 1 ) * stride;
				interpolations.length = ( index + 1 ) * interpolateStride;

			}

			var track = new typedKeyframeTrack( node, times, values );

			track.createInterpolant = function InterpolantFactoryMethodCubicBezier( result ) {

				return new CubicBezierInterpolation( this.times, this.values, this.getValueSize(), result, new Float32Array( interpolations ) );

			};

			return track;

		}

	};

	// interpolation

	function CubicBezierInterpolation( parameterPositions, sampleValues, sampleSize, resultBuffer, params ) {

		THREE.Interpolant.call( this, parameterPositions, sampleValues, sampleSize, resultBuffer );

		this.params = params;

	}

	CubicBezierInterpolation.prototype = Object.assign( Object.create( THREE.Interpolant.prototype ), {

		constructor: CubicBezierInterpolation,

		interpolate_: function ( i1, t0, t, t1 ) {

			var result = this.resultBuffer;
			var values = this.sampleValues;
			var stride = this.valueSize;

			var offset1 = i1 * stride;
			var offset0 = offset1 - stride;

			// No interpolation if next key frame is in one frame in 30fps. This is from MMD animation spec.
			var weight1 = ( ( t1 - t0 ) < 1 / 30 * 1.5 ) ? 0.0 : ( t - t0 ) / ( t1 - t0 );

			if ( stride === 4 ) { // Quaternion

				var x1 = this.params[ i1 * 4 + 0 ];
				var x2 = this.params[ i1 * 4 + 1 ];
				var y1 = this.params[ i1 * 4 + 2 ];
				var y2 = this.params[ i1 * 4 + 3 ];

				var ratio = this._calculate( x1, x2, y1, y2, weight1 );

				THREE.Quaternion.slerpFlat( result, 0, values, offset0, values, offset1, ratio );

			} else if ( stride === 3 ) { // Vector3

				for ( var i = 0; i !== stride; ++ i ) {

					var x1 = this.params[ i1 * 12 + i * 4 + 0 ];
					var x2 = this.params[ i1 * 12 + i * 4 + 1 ];
					var y1 = this.params[ i1 * 12 + i * 4 + 2 ];
					var y2 = this.params[ i1 * 12 + i * 4 + 3 ];

					var ratio = this._calculate( x1, x2, y1, y2, weight1 );

					result[ i ] = values[ offset0 + i ] * ( 1 - ratio ) + values[ offset1 + i ] * ratio;

				}

			} else { // Number

				var x1 = this.params[ i1 * 4 + 0 ];
				var x2 = this.params[ i1 * 4 + 1 ];
				var y1 = this.params[ i1 * 4 + 2 ];
				var y2 = this.params[ i1 * 4 + 3 ];

				var ratio = this._calculate( x1, x2, y1, y2, weight1 );

				result[ 0 ] = values[ offset0 ] * ( 1 - ratio ) + values[ offset1 ] * ratio;

			}

			return result;

		},

		_calculate: function ( x1, x2, y1, y2, x ) {

			/*
			 * Cubic Bezier curves
			 *   https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Cubic_B.C3.A9zier_curves
			 *
			 * B(t) = ( 1 - t ) ^ 3 * P0
			 *      + 3 * ( 1 - t ) ^ 2 * t * P1
			 *      + 3 * ( 1 - t ) * t^2 * P2
			 *      + t ^ 3 * P3
			 *      ( 0 <= t <= 1 )
			 *
			 * MMD uses Cubic Bezier curves for bone and camera animation interpolation.
			 *   http://d.hatena.ne.jp/edvakf/20111016/1318716097
			 *
			 *    x = ( 1 - t ) ^ 3 * x0
			 *      + 3 * ( 1 - t ) ^ 2 * t * x1
			 *      + 3 * ( 1 - t ) * t^2 * x2
			 *      + t ^ 3 * x3
			 *    y = ( 1 - t ) ^ 3 * y0
			 *      + 3 * ( 1 - t ) ^ 2 * t * y1
			 *      + 3 * ( 1 - t ) * t^2 * y2
			 *      + t ^ 3 * y3
			 *      ( x0 = 0, y0 = 0 )
			 *      ( x3 = 1, y3 = 1 )
			 *      ( 0 <= t, x1, x2, y1, y2 <= 1 )
			 *
			 * Here solves this equation with Bisection method,
			 *   https://en.wikipedia.org/wiki/Bisection_method
			 * gets t, and then calculate y.
			 *
			 * f(t) = 3 * ( 1 - t ) ^ 2 * t * x1
			 *      + 3 * ( 1 - t ) * t^2 * x2
			 *      + t ^ 3 - x = 0
			 *
			 * (Another option: Newton's method
			 *    https://en.wikipedia.org/wiki/Newton%27s_method)
			 */

			var c = 0.5;
			var t = c;
			var s = 1.0 - t;
			var loop = 15;
			var eps = 1e-5;
			var math = Math;

			var sst3, stt3, ttt;

			for ( var i = 0; i < loop; i ++ ) {

				sst3 = 3.0 * s * s * t;
				stt3 = 3.0 * s * t * t;
				ttt = t * t * t;

				var ft = ( sst3 * x1 ) + ( stt3 * x2 ) + ( ttt ) - x;

				if ( math.abs( ft ) < eps ) break;

				c /= 2.0;

				t += ( ft < 0 ) ? c : - c;
				s = 1.0 - t;

			}

			return ( sst3 * y1 ) + ( stt3 * y2 ) + ttt;

		}

	} );

	return MMDLoader;

} )();


THREE.MMDGrantSolver = ( function () {

	function MMDGrantSolver( mesh ) {

		this.mesh = mesh;

	}

	MMDGrantSolver.prototype = {

		constructor: MMDGrantSolver,

		update: function () {

			var q = new THREE.Quaternion();

			return function () {

				for ( var i = 0; i < this.mesh.geometry.grants.length; i ++ ) {

					var g = this.mesh.geometry.grants[ i ];
					var b = this.mesh.skeleton.bones[ g.index ];
					var pb = this.mesh.skeleton.bones[ g.parentIndex ];

					if ( g.isLocal ) {

						// TODO: implement
						if ( g.affectPosition ) {

						}

						// TODO: implement
						if ( g.affectRotation ) {

						}

					} else {

						// TODO: implement
						if ( g.affectPosition ) {

						}

						if ( g.affectRotation ) {

							q.set( 0, 0, 0, 1 );
							q.slerp( pb.quaternion, g.ratio );
							b.quaternion.multiply( q );

						}

					}

				}

			};

		}()

	};

	return MMDGrantSolver;

} )();


THREE.MMDHelper = ( function () {

	function MMDHelper() {

		this.meshes = [];

		this.doAnimation = true;
		this.doIk = true;
		this.doGrant = true;
		this.doPhysics = true;
		this.doCameraAnimation = true;

		this.sharedPhysics = false;
		this.masterPhysics = null;

		this.audioManager = null;
		this.camera = null;

	}

	MMDHelper.prototype = {

		constructor: MMDHelper,

		add: function ( mesh ) {

			if ( mesh.isSkinnedMesh !== true ) {

				throw new Error( 'THREE.MMDHelper.add() accepts only THREE.SkinnedMesh instance.' );

			}

			if ( mesh.mixer === undefined ) mesh.mixer = null;
			if ( mesh.ikSolver === undefined ) mesh.ikSolver = null;
			if ( mesh.grantSolver === undefined ) mesh.grantSolver = null;
			if ( mesh.physics === undefined ) mesh.physics = null;
			if ( mesh.looped === undefined ) mesh.looped = false;

			this.meshes.push( mesh );

			// workaround until I make IK and Physics Animation plugin
			this.initBackupBones( mesh );

		},

		setAudio: function ( audio, listener, params ) {

			this.audioManager = new AudioManager( audio, listener, params );

		},

		setCamera: function ( camera ) {

			camera.mixer = null;
			this.camera = camera;

		},

		setPhysicses: function ( params ) {

			for ( var i = 0; i < this.meshes.length; i ++ ) {

				this.setPhysics( this.meshes[ i ], params );

			}

		},

		setPhysics: function ( mesh, params ) {

			params = ( params === undefined ) ? {} : Object.assign( {}, params );

			if ( params.world === undefined && this.sharedPhysics ) {

				var masterPhysics = this.getMasterPhysics();

				if ( masterPhysics !== null ) params.world = masterPhysics.world;

			}

			var warmup = params.warmup !== undefined ? params.warmup : 60;

			var physics = new THREE.MMDPhysics( mesh, params );

			if ( mesh.mixer !== null && mesh.mixer !== undefined && params.preventAnimationWarmup !== true ) {

				this.animateOneMesh( 0, mesh );
				physics.reset();

			}

			physics.warmup( warmup );

			this.updateIKParametersDependingOnPhysicsEnabled( mesh, true );

			mesh.physics = physics;

		},

		getMasterPhysics: function () {

			if ( this.masterPhysics !== null ) return this.masterPhysics;

			for ( var i = 0, il = this.meshes.length; i < il; i ++ ) {

				var physics = this.meshes[ i ].physics;

				if ( physics !== undefined && physics !== null ) {

					this.masterPhysics = physics;
					return this.masterPhysics;

				}

			}

			return null;

		},

		enablePhysics: function ( enabled ) {

			if ( enabled === true ) {

				this.doPhysics = true;

			} else {

				this.doPhysics = false;

			}

			for ( var i = 0, il = this.meshes.length; i < il; i ++ ) {

				this.updateIKParametersDependingOnPhysicsEnabled( this.meshes[ i ], enabled );

			}

		},

		updateIKParametersDependingOnPhysicsEnabled: function ( mesh, physicsEnabled ) {

			var iks = mesh.geometry.iks;
			var bones = mesh.geometry.bones;

			for ( var j = 0, jl = iks.length; j < jl; j ++ ) {

				var ik = iks[ j ];
				var links = ik.links;

				for ( var k = 0, kl = links.length; k < kl; k ++ ) {

					var link = links[ k ];

					if ( physicsEnabled === true ) {

						// disable IK of the bone the corresponding rigidBody type of which is 1 or 2
						// because its rotation will be overriden by physics
						link.enabled = bones[ link.index ].rigidBodyType > 0 ? false : true;

					} else {

						link.enabled = true;

					}

				}

			}

		},

		setAnimations: function () {

			for ( var i = 0; i < this.meshes.length; i ++ ) {

				this.setAnimation( this.meshes[ i ] );

			}

		},

		setAnimation: function ( mesh ) {

			if ( mesh.geometry.animations !== undefined ) {

				mesh.mixer = new THREE.AnimationMixer( mesh );

				// TODO: find a workaround not to access (seems like) private properties
				//       the name of them begins with "_".
				mesh.mixer.addEventListener( 'loop', function ( e ) {

					if ( e.action._clip.tracks.length > 0 &&
					     e.action._clip.tracks[ 0 ].name.indexOf( '.bones' ) !== 0 ) return;

					var mesh = e.target._root;
					mesh.looped = true;

				} );

				var foundAnimation = false;
				var foundMorphAnimation = false;

				for ( var i = 0; i < mesh.geometry.animations.length; i ++ ) {

					var clip = mesh.geometry.animations[ i ];

					var action = mesh.mixer.clipAction( clip );

					if ( clip.tracks.length > 0 && clip.tracks[ 0 ].name.indexOf( '.morphTargetInfluences' ) === 0 ) {

						if ( ! foundMorphAnimation ) {

							action.play();
							foundMorphAnimation = true;

						}

					} else {

						if ( ! foundAnimation ) {

							action.play();
							foundAnimation = true;

						}

					}

				}

				if ( foundAnimation ) {

					mesh.ikSolver = new THREE.CCDIKSolver( mesh );

					if ( mesh.geometry.grants !== undefined ) {

						mesh.grantSolver = new THREE.MMDGrantSolver( mesh );

					}

				}

			}

		},

		setCameraAnimation: function ( camera ) {

			if ( camera.animations !== undefined ) {

				camera.mixer = new THREE.AnimationMixer( camera );
				camera.mixer.clipAction( camera.animations[ 0 ] ).play();

			}

		},

		/*
		 * detect the longest duration among model, camera, and audio animations and then
		 * set it to them to sync.
		 * TODO: touching private properties ( ._actions and ._clip ) so consider better way
		 *       to access them for safe and modularity.
		 */
		unifyAnimationDuration: function ( params ) {

			params = params === undefined ? {} : params;

			var max = 0.0;

			var camera = this.camera;
			var audioManager = this.audioManager;

			// check the longest duration
			for ( var i = 0; i < this.meshes.length; i ++ ) {

				var mesh = this.meshes[ i ];
				var mixer = mesh.mixer;

				if ( mixer === null ) {

					continue;

				}

				for ( var j = 0; j < mixer._actions.length; j ++ ) {

					var action = mixer._actions[ j ];
					max = Math.max( max, action._clip.duration );

				}

			}

			if ( camera !== null && camera.mixer !== null ) {

				var mixer = camera.mixer;

				for ( var i = 0; i < mixer._actions.length; i ++ ) {

					var action = mixer._actions[ i ];
					max = Math.max( max, action._clip.duration );

				}

			}

			if ( audioManager !== null ) {

				max = Math.max( max, audioManager.duration );

			}

			if ( params.afterglow !== undefined ) {

				max += params.afterglow;

			}

			// set the duration
			for ( var i = 0; i < this.meshes.length; i ++ ) {

				var mesh = this.meshes[ i ];
				var mixer = mesh.mixer;

				if ( mixer === null ) {

					continue;

				}

				for ( var j = 0; j < mixer._actions.length; j ++ ) {

					var action = mixer._actions[ j ];
					action._clip.duration = max;

				}

			}

			if ( camera !== null && camera.mixer !== null ) {

				var mixer = camera.mixer;

				for ( var i = 0; i < mixer._actions.length; i ++ ) {

					var action = mixer._actions[ i ];
					action._clip.duration = max;

				}

			}

			if ( audioManager !== null ) {

				audioManager.duration = max;

			}

		},

		controlAudio: function ( delta ) {

			if ( this.audioManager === null ) {

				return;

			}

			this.audioManager.control( delta );

		},

		animate: function ( delta ) {

			this.controlAudio( delta );

			for ( var i = 0; i < this.meshes.length; i ++ ) {

				this.animateOneMesh( delta, this.meshes[ i ] );

			}

			if ( this.sharedPhysics ) this.updateSharedPhysics( delta );

			this.animateCamera( delta );

		},

		animateOneMesh: function ( delta, mesh ) {

			var mixer = mesh.mixer;
			var ikSolver = mesh.ikSolver;
			var grantSolver = mesh.grantSolver;
			var physics = mesh.physics;

			if ( mixer !== null && this.doAnimation === true ) {

				// restore/backupBones are workaround
				// until I make IK, Grant, and Physics Animation plugin
				this.restoreBones( mesh );

				mixer.update( delta );

				this.backupBones( mesh );

			}

			if ( ikSolver !== null && this.doIk === true ) {

				ikSolver.update();

			}

			if ( grantSolver !== null && this.doGrant === true ) {

				grantSolver.update();

			}

			if ( mesh.looped === true ) {

				if ( physics !== null ) physics.reset();

				mesh.looped = false;

			}

			if ( physics !== null && this.doPhysics && ! this.sharedPhysics ) {

				physics.update( delta );

			}

		},

		updateSharedPhysics: function ( delta ) {

			if ( this.meshes.length === 0 || ! this.doPhysics || ! this.sharedPhysics ) return;

			var physics = this.getMasterPhysics();

			if ( physics === null ) return;

			for ( var i = 0, il = this.meshes.length; i < il; i ++ ) {

				var p = this.meshes[ i ].physics;

				if ( p !== null && p !== undefined ) {

					p.updateRigidBodies();

				}

			}

			physics.stepSimulation( delta );

			for ( var i = 0, il = this.meshes.length; i < il; i ++ ) {

				var p = this.meshes[ i ].physics;

				if ( p !== null && p !== undefined ) {

					p.updateBones();

				}

			}

		},

		animateCamera: function ( delta ) {

			if ( this.camera === null ) {

				return;

			}

			var mixer = this.camera.mixer;

			if ( mixer !== null && this.camera.center !== undefined && this.doCameraAnimation === true ) {

				mixer.update( delta );

				// TODO: Let PerspectiveCamera automatically update?
				this.camera.updateProjectionMatrix();

				this.camera.up.set( 0, 1, 0 );
				this.camera.up.applyQuaternion( this.camera.quaternion );
				this.camera.lookAt( this.camera.center );

			}

		},

		poseAsVpd: function ( mesh, vpd, params ) {

			if ( params === undefined ) params = {};

			if ( params.preventResetPose !== true ) mesh.pose();

			var bones = mesh.skeleton.bones;
			var bones2 = vpd.bones;

			var table = {};

			for ( var i = 0; i < bones.length; i ++ ) {

				table[ bones[ i ].name ] = i;

			}

			var thV = new THREE.Vector3();
			var thQ = new THREE.Quaternion();

			for ( var i = 0; i < bones2.length; i ++ ) {

				var b = bones2[ i ];
				var index = table[ b.name ];

				if ( index === undefined ) continue;

				var b2 = bones[ index ];
				var t = b.translation;
				var q = b.quaternion;

				thV.set( t[ 0 ], t[ 1 ], t[ 2 ] );
				thQ.set( q[ 0 ], q[ 1 ], q[ 2 ], q[ 3 ] );

				b2.position.add( thV );
				b2.quaternion.multiply( thQ );

			}

			mesh.updateMatrixWorld( true );

			if ( params.preventIk !== true ) {

				var solver = new THREE.CCDIKSolver( mesh );
				solver.update( params.saveOriginalBonesBeforeIK );

			}

			if ( params.preventGrant !== true && mesh.geometry.grants !== undefined ) {

				var solver = new THREE.MMDGrantSolver( mesh );
				solver.update();

			}

		},

		/*
		 * Note: These following three functions are workaround for r74dev.
		 *       THREE.PropertyMixer.apply() seems to save values into buffer cache
		 *       when mixer.update() is called.
		 *       ikSolver.update() and physics.update() change bone position/quaternion
		 *       without mixer.update() then buffer cache will be inconsistent.
		 *       So trying to avoid buffer cache inconsistency by doing
		 *       backup bones position/quaternion right after mixer.update() call
		 *       and then restore them after rendering.
		 */
		initBackupBones: function ( mesh ) {

			mesh.skeleton.backupBones = [];

			for ( var i = 0; i < mesh.skeleton.bones.length; i ++ ) {

				mesh.skeleton.backupBones.push( mesh.skeleton.bones[ i ].clone() );

			}

		},

		backupBones: function ( mesh ) {

			mesh.skeleton.backupBoneIsSaved = true;

			for ( var i = 0; i < mesh.skeleton.bones.length; i ++ ) {

				var b = mesh.skeleton.backupBones[ i ];
				var b2 = mesh.skeleton.bones[ i ];
				b.position.copy( b2.position );
				b.quaternion.copy( b2.quaternion );

			}

		},

		restoreBones: function ( mesh ) {

			if ( mesh.skeleton.backupBoneIsSaved !== true ) {

				return;

			}

			mesh.skeleton.backupBoneIsSaved = false;

			for ( var i = 0; i < mesh.skeleton.bones.length; i ++ ) {

				var b = mesh.skeleton.bones[ i ];
				var b2 = mesh.skeleton.backupBones[ i ];
				b.position.copy( b2.position );
				b.quaternion.copy( b2.quaternion );

			}

		}

	};

	//

	function AudioManager( audio, listener, params ) {

		params = params || {};

		this.audio = audio;
		this.listener = listener;

		this.elapsedTime = 0.0;
		this.currentTime = 0.0;
		this.delayTime = params.delayTime !== undefined ? params.delayTime : 0.0;

		this.audioDuration = this.audio.buffer.duration;
		this.duration = this.audioDuration + this.delayTime;

	}

	AudioManager.prototype = {

		constructor: AudioManager,

		control: function ( delta ) {

			this.elapsed += delta;
			this.currentTime += delta;

			if ( this.checkIfStopAudio() ) {

				this.audio.stop();

			}

			if ( this.checkIfStartAudio() ) {

				this.audio.play();

			}

		},

		checkIfStartAudio: function () {

			if ( this.audio.isPlaying ) {

				return false;

			}

			while ( this.currentTime >= this.duration ) {

				this.currentTime -= this.duration;

			}

			if ( this.currentTime < this.delayTime ) {

				return false;

			}

			this.audio.startTime = this.currentTime - this.delayTime;

			return true;

		},

		checkIfStopAudio: function () {

			if ( ! this.audio.isPlaying ) {

				return false;

			}

			if ( this.currentTime >= this.duration ) {

				return true;

			}

			return false;

		}

	};

	return MMDHelper;

} )();
