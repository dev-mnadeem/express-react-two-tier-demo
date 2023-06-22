import { randomBytes } from "node:crypto";

import { User } from "../models/index.js";

import { passwordHasher } from "./password/index.js";
import { logger } from "./logger.js";

/**
 * A realistic roster, large enough that pagination is exercised rather than
 * merely present. Addresses use the reserved `.example` TLD so nothing here can
 * ever reach a real inbox.
 */
export const SEED_USERS = Object.freeze([
  ["Amelia", "Hartley", "amelia.hartley@roster.example"],
  ["Rajesh", "Iyer", "rajesh.iyer@roster.example"],
  ["Sofia", "Marchetti", "sofia.marchetti@roster.example"],
  ["Daniel", "Okafor", "daniel.okafor@roster.example"],
  ["Mei", "Lin", "mei.lin@roster.example"],
  ["Tomas", "Berg", "tomas.berg@roster.example"],
  ["Priya", "Raman", "priya.raman@roster.example"],
  ["Lucas", "Fernandes", "lucas.fernandes@roster.example"],
  ["Noor", "Al-Sayed", "noor.alsayed@roster.example"],
  ["Erik", "Johansson", "erik.johansson@roster.example"],
  ["Chloe", "Dubois", "chloe.dubois@roster.example"],
  ["Kwame", "Mensah", "kwame.mensah@roster.example"],
  ["Hannah", "Weiss", "hannah.weiss@roster.example"],
  ["Diego", "Alvarez", "diego.alvarez@roster.example"],
  ["Yuki", "Tanaka", "yuki.tanaka@roster.example"],
  ["Fatima", "Zahra", "fatima.zahra@roster.example"],
  ["Oliver", "Whitfield", "oliver.whitfield@roster.example"],
  ["Ingrid", "Solberg", "ingrid.solberg@roster.example"],
  ["Marcus", "Bello", "marcus.bello@roster.example"],
  ["Elena", "Petrova", "elena.petrova@roster.example"],
  ["Samuel", "Nkemdirim", "samuel.nkemdirim@roster.example"],
  ["Aisha", "Khan", "aisha.khan@roster.example"],
  ["Jonas", "Lindqvist", "jonas.lindqvist@roster.example"],
  ["Carla", "Ricci", "carla.ricci@roster.example"],
  ["Ben", "Halloran", "ben.halloran@roster.example"],
  ["Nadia", "Haddad", "nadia.haddad@roster.example"],
  ["Peter", "Novak", "peter.novak@roster.example"],
  ["Grace", "Adeyemi", "grace.adeyemi@roster.example"],
  ["Hugo", "Martins", "hugo.martins@roster.example"],
  ["Leila", "Farsi", "leila.farsi@roster.example"],
  ["Anton", "Kovacs", "anton.kovacs@roster.example"],
  ["Rosa", "Delgado", "rosa.delgado@roster.example"],
  ["Felix", "Braun", "felix.braun@roster.example"],
  ["Ayana", "Tesfaye", "ayana.tesfaye@roster.example"],
]);

export const seedUsers = async () => {
  // Nothing signs in, so demo rows get a random password nobody knows rather
  // than a shared one that would end up in the repository.
  const password = await passwordHasher.hash(
    randomBytes(18).toString("base64url")
  );
  let created = 0;

  for (const [firstName, lastName, email] of SEED_USERS) {
    const [, isNew] = await User.scope("withPassword").findOrCreate({
      where: { email },
      defaults: { firstName, lastName, email, password },
    });

    if (isNew) created += 1;
  }

  logger.info(
    `Seed complete: ${created} created, ${SEED_USERS.length - created} already present`
  );

  return { created, total: SEED_USERS.length };
};
