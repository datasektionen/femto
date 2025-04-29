import { useEffect } from 'react';
import { Alert } from "@mantine/core";
import LinkCreator from "../components/LinkCreator.tsx";
import { Header } from "methone";
import { useAuth } from "../autherization/useAuth.ts";

/**
 * Homepage for Femto, using real authentication data from AuthContext
 */

const Home = () => {
  const { 
    hasToken, 
    userMandates, 
    userPermissions, 
    isAdmin,
    refreshAuthData
  } = useAuth();
  
  // Refresh auth data when component mounts
  useEffect(() => {
    refreshAuthData();
  }, []);
  
  // Check if user can create custom links
  const canCreateCustomLinks = 
    isAdmin || 
    (Array.isArray(userPermissions) && userPermissions.length > 0) ||
    (Array.isArray(userMandates) && userMandates.some(mandate => mandate?.id && mandate?.role));
  
  console.log("Home render - Can create custom links:", canCreateCustomLinks);
  console.log("User permissions:", userPermissions);
  console.log("User mandates:", userMandates);
  
  return (
    <>
        <Header title="Länkförkortare" />
        <div id="content">
            {!hasToken && (
                <Alert title="Du är inte inloggad" color="blue">
                    Logga in för att förkorta länkar
                </Alert>
            )}
            <div
                style={{
                    marginBottom: "25px",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <p>
                    Trött på långa länkar? Då har vi systemet just för dig.
                    Stoppa in din långa länk, klicka på "Förkorta" och vips
                    har du en länk man lätt kommer ihåg.
                </p>
                <p>Du kan testa genom att stoppa in example.com</p>
                <p>
                    <b>
                        Detta system får bara användas i sektionsrelaterade
                        ändamål. Du måste vara inloggad för att kunna
                        förkorta en länk.
                    </b>
                </p>
                <p>
                    Tänk på vad som finns i länken du förkortar. Se till att
                    länken inte innehåller några personliga tokens eller
                    liknande.
                </p>
            </div>
            
            {/* Single LinkCreator Component with conditional features */}
            <LinkCreator
                title="Förkorta en länk"
                disabled={!hasToken}
                desc={
                    <>
                        <p>Slumpa en fyra karaktärer lång sträng.</p>
                        {canCreateCustomLinks && (
                            <p>Du kan också specificera en egen kort länk (t.ex. "ior").</p>
                        )}
                    </>
                }
                custom={canCreateCustomLinks} // Only show custom field if user has permission
                userMandates={userMandates || []}
                showAdvancedOptions={canCreateCustomLinks} // New prop to control visibility of advanced options
            />
        </div>
    </>
  );
};

export default Home;
