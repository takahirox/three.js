export default /* glsl */`
#ifdef USE_BATCHING

	objectNormal = vec4( batchingMatrix * vec4( objectNormal, 0.0 ) ).xyz;

	#ifdef USE_TANGENT

		objectTangent = vec4( batchingMatrix * vec4( objectTangent, 0.0 ) ).xyz;

	#endif

#endif
`;
