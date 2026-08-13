import { allKitchenIngredients } from "./kitchenInventory";

export function buildGenerationContext(profile = {}, inventory = {}, kernelBrief = null) {
  const kitchenItems = allKitchenIngredients({
    pantry: inventory.pantry || [],
    fridge: inventory.fridge || [],
    freezer: inventory.freezer || [],
  });
  const reviewedProfileFields = [
    profile.age && "age",
    profile.weight && "weight",
    profile.height && "height",
    profile.healthGoals?.length && "goals",
    profile.conditions?.length && "health considerations",
    profile.otherHealthConditions && "other health conditions",
    profile.surgicalHistory && "surgical history",
    profile.medications && "medications",
    profile.allergies && "allergies",
    profile.dietaryPattern && "dietary pattern",
    profile.avoidIngredients && "avoid list",
  ].filter(Boolean);

  return {
    profileReady: Boolean(profile.completedAt),
    reviewedProfileFields,
    kitchenItems,
    pantryText: kitchenItems.join(", "),
    crossKernelSignals: kernelBrief?.signals || {},
    kernelMemory: kernelBrief?.kernelMemory || null,
    dataBoundaries: kernelBrief?.boundaries || null,
    reviewedAt: new Date().toISOString(),
  };
}
