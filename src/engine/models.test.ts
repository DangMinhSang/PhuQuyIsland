import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { fishingBoat } from './models';

describe('authored maritime geometry', () => {
  it('merges indexed fittings and the non-indexed hull into four valid meshes', () => {
    const errors = vi.spyOn(console, 'error');
    const boat = fishingBoat();
    expect(errors).not.toHaveBeenCalled();
    expect(boat.children).toHaveLength(4);
    for (const child of boat.children) {
      expect(child).toBeInstanceOf(THREE.Mesh);
      const mesh = child as THREE.Mesh;
      expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(mesh.geometry.getAttribute('normal').count).toBe(mesh.geometry.getAttribute('position').count);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    const bounds = new THREE.Box3().setFromObject(boat);
    expect(Number.isFinite(bounds.min.y)).toBe(true);
    expect(bounds.max.y).toBeGreaterThan(5);
    errors.mockRestore();
  });
});
