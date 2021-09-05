export default /* glsl */`
#ifdef USE_BATCHING

	transformed = ( batchingMatrix * vec4( transformed, 1.0 ) ).xyz;

#endif
`;
