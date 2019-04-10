THREE.GLTFLODExtension = ( function () {

	var Plugin = THREE.GLTFLoader.Plugin;

	function GLTFLODExtension() {

		Plugin.call( this, 'MSFT_lod' );

	}

	GLTFLODExtension.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: GLTFLODExtension,

		onAfterScene: function ( scene, sceneDef, parser ) {

			scene.traverse( function ( object ) {

				if ( object.material && object.material.userData.MSFT_lod ) {

					delete object.material.userData.MSFT_lod;

				}

			} );

			return scene;

		},

		onAfterNode: function ( node, nodeDef, parser ) {

			var extensions = nodeDef.extensions;
			var nodeHasLod = !! ( extensions && extensions[ this.name ] );
			var materialHasLod = !! ( node.material && node.material.userData.MSFT_lod );

			if ( ! nodeHasLod && ! materialHasLod ) return node;

			var materials = materialHasLod ? node.material.userData.MSFT_lod : [];
			var nodePending = [];

			if ( nodeHasLod ) {

				var ids = extensions[ this.name ].ids;

				for ( var i = 0, il = ids.length; i < il; i ++ ) {

					nodePending.push( parser.getDependency( 'node', ids[ i ] ) );

				}

			}

			var lod = new THREE.LOD();
			lod.addLevel( node, 0 );

			return Promise.all( nodePending ).then( function ( nodes ) {

				var length = nodeHasLod ? nodes.length : materials.length;

				for ( var i = 0; i < length; i ++ ) {

					var geometry = nodeHasLod ? nodes[ i ].geometry : node.geometry;
					var material = materialHasLod ? materials[ i ] : node.material;

					// @DEBUG For visualize LOD
					if ( materialHasLod ) {

						material.color.multiplyScalar( 1 / ( i + 2 ) );

					}

					// @TODO Cache
					var mesh = new node.constructor( geometry, material );

					// @TODO Implement properly
					lod.addLevel( mesh, 0.05 * ( i + 1 ) );

				}

				return lod;

			} );

		},

		onAfterMaterial: function ( material, materialDef, parser ) {

			var extensions = materialDef.extensions;

			if ( ! extensions || ! extensions[ this.name ] ) {

				return material;

			}

			var ids = extensions[ this.name ].ids;

			var pending = [];

			for ( var i = 0, il = ids.length; i < il; i ++ ) {

				pending.push( parser.getDependency( 'material', ids[ i ] ) );

			}

			return Promise.all( pending ).then( function( materials ) {

				material.userData.MSFT_lod = materials;
				return material;

			} );

			return material;

		}

	} );

	return GLTFLODExtension;

} )();
